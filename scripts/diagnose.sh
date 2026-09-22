#!/bin/bash

# ============================================
# Paxala Media — Server diagnostics
# ============================================
#
# Read-only health report for the running stack, with the IMAGE PATH traced
# end to end: configuration -> files on disk -> container mounts -> what
# nginx serves -> what Next serves -> the image optimizer -> the real image
# URLs stored in the database -> the image requests browsers actually made.
#
# Usage (from anywhere inside the project on the server):
#   ./scripts/diagnose.sh            everything
#   ./scripts/diagnose.sh images     image checks only
#   ./scripts/diagnose.sh logs       recent errors only
#
# SAFE ON PRODUCTION. It restarts nothing, changes nothing, and writes only
# its own report file. Secrets are never printed — only whether each one is
# set. The full report is saved to /tmp so it can be pasted back as-is.
#
# Deliberately NOT `set -e`: a diagnostic that stops at the first failure
# hides every other problem. Each check reports and the script carries on.

set -u

cd "$(dirname "$0")/.." || exit 1

COMPOSE_FILE="docker-compose.yml"
ENV_FILE=".env.production"
SECTION="${1:-all}"
REPORT="/tmp/pmp-diagnose-$(date +%Y%m%d-%H%M%S).txt"
FAILURES=0
WARNINGS=0

# Everything below goes to the screen AND the report file.
exec > >(tee "$REPORT") 2>&1

# ---- output helpers -------------------------------------------------------

section() { printf '\n==== %s ====\n' "$*"; }
pass()    { printf '  [ OK ]  %s\n' "$*"; }
fail()    { printf '  [FAIL]  %s\n' "$*"; FAILURES=$((FAILURES + 1)); }
warn()    { printf '  [WARN]  %s\n' "$*"; WARNINGS=$((WARNINGS + 1)); }
info()    { printf '          %s\n' "$*"; }
hint()    { printf '          -> %s\n' "$*"; }

# ---- plumbing -------------------------------------------------------------

dc() { docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" "$@" 2>/dev/null; }

# Read one key from the env file WITHOUT sourcing it: sourcing executes the
# file as shell, and a value containing $ or backticks would run.
env_value() {
  grep -E "^$1=" "$ENV_FILE" 2>/dev/null | tail -1 | cut -d= -f2- \
    | sed -e 's/^["'\'']//' -e 's/["'\'']$//'
}

is_set() { [[ -n "$(env_value "$1")" ]]; }

# Status code, content type and size of a URL. Only the first 2KB is
# fetched (a Range request) so a large video costs nothing to check.
probe() {
  local out
  out="$(curl -s -o /dev/null -r 0-2047 --max-time 20 \
    -w '%{http_code} %{content_type}' "$@" 2>/dev/null)"
  [[ "$out" == 000* || -z "$out" ]] && out="000 unreachable"
  printf '%s' "$out"
}

probe_ok() { [[ "$1" == 200* || "$1" == 206* ]]; }

urlencode() {
  local s="$1" out="" c i
  for ((i = 0; i < ${#s}; i++)); do
    c="${s:i:1}"
    case "$c" in
      [a-zA-Z0-9.~_-]) out+="$c" ;;
      *) out+=$(printf '%%%02X' "'$c") ;;
    esac
  done
  printf '%s' "$out"
}

# Which kind of URL is this? Most image bugs are a URL pointing somewhere wrong.
classify() {
  case "$1" in
    https://res.cloudinary.com/*) echo "cloudinary" ;;
    http://localhost*|https://localhost*|http://127.0.0.1*) echo "LOCALHOST" ;;
    /*) echo "relative" ;;
    http://*) echo "insecure-http" ;;
    https://*) echo "absolute" ;;
    "") echo "empty" ;;
    *) echo "unknown" ;;
  esac
}

SITE_URL="$(env_value NEXT_PUBLIC_SITE_URL)"
SITE_URL="${SITE_URL%/}"
SITE_HOST="${SITE_URL#*://}"
SITE_HOST="${SITE_HOST%%/*}"
PGUSER_VALUE="$(env_value POSTGRES_USER)"
PGUSER_VALUE="${PGUSER_VALUE:-paxala}"
PGDB_VALUE="$(env_value POSTGRES_DB)"
PGDB_VALUE="${PGDB_VALUE:-paxala_media}"

psql_query() {
  dc exec -T postgres psql -U "$PGUSER_VALUE" -d "$PGDB_VALUE" -At -F '|' -c "$1"
}

printf 'Paxala Media diagnostics — %s\n' "$(date -u '+%Y-%m-%d %H:%M UTC')"
printf 'Host: %s   Commit: %s\n' "$(hostname)" "$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"

# ===========================================================================
check_stack() {
  section "1. Containers and health"

  local name status
  for name in pmp_postgres pmp_app pmp_nginx pmp_coturn; do
    status="$(docker inspect -f '{{.State.Status}}{{if .State.Health}} / {{.State.Health.Status}}{{end}}' "$name" 2>/dev/null)"
    if [[ -z "$status" ]]; then
      if [[ "$name" == "pmp_coturn" ]]; then
        warn "$name not present (TURN relay is optional)"
      else
        fail "$name does not exist"
      fi
    elif [[ "$status" == running* && "$status" != *unhealthy* ]]; then
      pass "$name: $status"
    else
      fail "$name: $status"
      hint "docker logs --tail 50 $name"
    fi
  done

  local health
  health="$(curl -s --max-time 10 http://localhost:3000/api/health 2>/dev/null)"
  if [[ "$health" == *'"status":"healthy"'* ]]; then
    pass "app /api/health: $health"
  else
    fail "app /api/health did not answer healthy: ${health:-no response}"
  fi

  local use
  use="$(df -P . | awk 'NR==2 {print $5}' | tr -d '%')"
  if [[ -n "$use" && "$use" -ge 90 ]]; then
    fail "disk ${use}% full — uploads and builds fail when the disk fills"
  else
    pass "disk ${use:-?}% used"
  fi
}

# ===========================================================================
check_config() {
  section "2. Configuration (values of secrets are never printed)"

  if [[ ! -f "$ENV_FILE" ]]; then
    fail "$ENV_FILE not found in $(pwd)"
    return
  fi
  pass "$ENV_FILE present"

  case "$(classify "$SITE_URL/")" in
    absolute) pass "NEXT_PUBLIC_SITE_URL = $SITE_URL" ;;
    LOCALHOST)
      fail "NEXT_PUBLIC_SITE_URL = $SITE_URL — every locally stored upload gets a localhost URL"
      hint "set NEXT_PUBLIC_SITE_URL=https://paxaland.com, then deploy (it is baked in at build time)" ;;
    *)
      warn "NEXT_PUBLIC_SITE_URL = '${SITE_URL:-unset}'"
      hint "local uploads are stored as absolute URLs built from this value" ;;
  esac

  if is_set CLOUDINARY_CLOUD_NAME && is_set CLOUDINARY_API_KEY && is_set CLOUDINARY_API_SECRET; then
    pass "Cloudinary configured (cloud: $(env_value CLOUDINARY_CLOUD_NAME))"
  else
    warn "Cloudinary not fully configured — uploads fall back to local disk"
  fi

  local key
  for key in GEMINI_API_KEY TURN_SECRET SMTP_HOST; do
    if is_set "$key"; then pass "$key set"; else warn "$key not set"; fi
  done

  # What the RUNNING container actually received. A key in the env file that
  # docker-compose.yml does not list never reaches the app — this repo has
  # been bitten by exactly that (Cloudinary, then Gemini).
  local runtime
  runtime="$(dc exec -T app printenv NEXT_PUBLIC_SITE_URL | tr -d '\r')"
  if [[ -n "$runtime" && "${runtime%/}" == "$SITE_URL" ]]; then
    pass "container sees NEXT_PUBLIC_SITE_URL = $runtime"
  else
    fail "container NEXT_PUBLIC_SITE_URL = '${runtime:-unset}' (env file says '$SITE_URL')"
  fi
  for key in CLOUDINARY_API_SECRET GEMINI_API_KEY; do
    if dc exec -T app sh -c "test -n \"\$$key\""; then
      pass "container has $key"
    elif is_set "$key"; then
      fail "$key is in $ENV_FILE but NOT in the container — missing from docker-compose.yml"
    fi
  done
}

# ===========================================================================
check_storage() {
  section "3. Files on disk and container mounts"

  if [[ ! -d public/uploads ]]; then
    fail "host public/uploads does not exist"
    return
  fi

  local count size owner
  count="$(find public/uploads -type f | wc -l)"
  size="$(du -sh public/uploads 2>/dev/null | cut -f1)"
  owner="$(stat -c '%U:%G %a' public/uploads)"
  pass "host public/uploads: $count files, $size (owner $owner)"
  local dir
  for dir in portfolio playground projects; do
    [[ -d "public/uploads/$dir" ]] && info "$dir: $(find "public/uploads/$dir" -type f | wc -l) files"
  done

  # The app and nginx must both see the SAME directory the host has.
  local in_app in_nginx
  in_app="$(dc exec -T app sh -c 'find /app/public/uploads -type f 2>/dev/null | wc -l' | tr -d ' \r')"
  in_nginx="$(dc exec -T nginx sh -c 'find /var/www/paxala-media/public/uploads -type f 2>/dev/null | wc -l' | tr -d ' \r')"
  if [[ "$in_app" == "$count" ]]; then
    pass "app container sees all $in_app files (mount OK)"
  else
    fail "app container sees ${in_app:-0} files, host has $count — the uploads mount is not working"
  fi
  if [[ "$in_nginx" == "$count" ]]; then
    pass "nginx container sees all $in_nginx files (mount OK)"
  else
    fail "nginx container sees ${in_nginx:-0} files, host has $count"
  fi

  # Writability without writing: `test -w` as the app's own user.
  if dc exec -T app sh -c 'test -w /app/public/uploads'; then
    pass "app user can write uploads"
  else
    fail "app user CANNOT write /app/public/uploads — local-disk uploads will fail"
    hint "chown -R 1001:1001 $(pwd)/public/uploads"
  fi
  if dc exec -T app sh -c 'test -w /app/storage/invoices'; then
    pass "app user can write invoice storage (volume pmp_storage_data)"
  else
    fail "app user cannot write /app/storage/invoices"
  fi
}

# ===========================================================================
check_serving() {
  section "4. How one real image is served"

  local file
  file="$(find public/uploads -type f \( -iname '*.png' -o -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.webp' \) 2>/dev/null | head -1)"
  if [[ -z "$file" ]]; then
    warn "no image file found under public/uploads to test with"
    return
  fi
  local path="/${file#public/}"
  info "test file: $path"

  local result
  result="$(probe "$SITE_URL$path")"
  if probe_ok "$result"; then pass "public  $SITE_URL$path -> $result"
  else fail "public  $SITE_URL$path -> $result"; fi

  # The same request pinned to this machine's nginx, skipping DNS and any CDN
  # in front. Public fails + local passes = the problem is outside the server.
  if [[ "$SITE_URL" == https://* ]]; then
    result="$(probe --resolve "$SITE_HOST:443:127.0.0.1" "$SITE_URL$path")"
  else
    result="$(probe --resolve "$SITE_HOST:80:127.0.0.1" "$SITE_URL$path")"
  fi
  if probe_ok "$result"; then pass "nginx   (local, same URL) -> $result"
  else fail "nginx   (local, same URL) -> $result"
       hint "the file is on disk but this server's nginx won't serve it: /uploads/ alias, mount, or permissions"; fi

  # The second domain has no /uploads/ location — it falls through to Next.
  result="$(probe "https://paxalamedia.com$path")"
  if probe_ok "$result"; then pass "other   https://paxalamedia.com$path -> $result"
  else warn "other   https://paxalamedia.com$path -> $result (this domain has no nginx /uploads/ block)"; fi

  result="$(probe "http://localhost:3000$path")"
  if probe_ok "$result"; then pass "next    http://localhost:3000$path -> $result"
  else fail "next    http://localhost:3000$path -> $result"
       hint "Next's /uploads route reads /app/public/uploads at request time — compare the mount counts in section 3"; fi

  # The image optimizer — what <Image> components actually request.
  local relative absolute
  relative="http://localhost:3000/_next/image?url=$(urlencode "$path")&w=640&q=75"
  absolute="http://localhost:3000/_next/image?url=$(urlencode "$SITE_URL$path")&w=640&q=75"
  result="$(probe "$relative")"
  if probe_ok "$result"; then pass "optimizer (relative URL) -> $result"
  else fail "optimizer (relative URL) -> $result"; fi
  result="$(probe "$absolute")"
  if probe_ok "$result"; then pass "optimizer (absolute URL) -> $result"
  else fail "optimizer (absolute URL) -> $result"
       hint "400 = host missing from images.remotePatterns; 500/502 = the container cannot reach $SITE_HOST"; fi
}

# ===========================================================================
check_database_urls() {
  section "5. Image URLs stored in the database (latest of each kind)"

  if ! psql_query "select 1" >/dev/null; then
    fail "cannot query Postgres as $PGUSER_VALUE/$PGDB_VALUE"
    return
  fi

  # Where do stored URLs point? A pile of localhost or wrong-host URLs is
  # the classic cause of images that exist but never load.
  info "PlaygroundFile URL hosts:"
  psql_query "select coalesce(nullif(split_part(url,'/',3),''),'(relative)'), count(*) from \"PlaygroundFile\" group by 1 order by 2 desc" \
    | while IFS='|' read -r host n; do info "  $n × $host"; done
  info "Portfolio thumbnail hosts:"
  psql_query "select coalesce(nullif(split_part(thumbnail,'/',3),''),'(relative)'), count(*) from \"Portfolio\" where thumbnail is not null group by 1 order by 2 desc" \
    | while IFS='|' read -r host n; do info "  $n × $host"; done

  local rows
  rows="$(psql_query "
    (select 'PlaygroundFile.url', url from \"PlaygroundFile\" order by \"createdAt\" desc limit 4)
    union all
    (select 'PlaygroundFile.thumbUrl', \"thumbUrl\" from \"PlaygroundFile\" where \"thumbUrl\" is not null order by \"createdAt\" desc limit 4)
    union all
    (select 'Portfolio.thumbnail', thumbnail from \"Portfolio\" where thumbnail is not null order by \"createdAt\" desc limit 4)
    union all
    (select 'ProjectFile.url', url from \"ProjectFile\" order by \"createdAt\" desc limit 3)
    union all
    (select 'TeamMember.image', image from \"TeamMember\" where image is not null order by \"createdAt\" desc limit 2)
    union all
    (select 'BlogPost.coverImage', \"coverImage\" from \"BlogPost\" where \"coverImage\" is not null order by \"createdAt\" desc limit 2)
  ")"

  if [[ -z "$rows" ]]; then
    warn "no image URLs found in the database"
    return
  fi

  local ok=0 broken=0 source url kind target result
  while IFS='|' read -r source url; do
    [[ -z "$url" ]] && continue
    kind="$(classify "$url")"
    target="$url"
    [[ "$kind" == "relative" ]] && target="$SITE_URL$url"
    result="$(probe "$target")"
    if probe_ok "$result"; then
      ok=$((ok + 1))
      pass "$source [$kind] $result"
      info "$url"
    else
      broken=$((broken + 1))
      fail "$source [$kind] $result"
      info "$url"
      case "$kind:$result" in
        LOCALHOST:*) hint "stored with a localhost URL — NEXT_PUBLIC_SITE_URL was unset when it was uploaded" ;;
        cloudinary:401*|cloudinary:404*)
          [[ "$source" == *thumb* ]] && hint "Cloudinary thumbnail refused: check Settings > Security > 'Strict transformations' in the Cloudinary console" ;;
        *:404*) hint "the URL is well-formed but the file is not there (lost, or never written)" ;;
        *:000*) hint "the host did not answer at all (DNS, TLS or firewall)" ;;
      esac
    fi
  done <<< "$rows"

  info "summary: $ok loaded, $broken broken"
}

# ===========================================================================
check_logs() {
  section "6. Recent errors"

  # Image requests real browsers made and nginx answered with an error.
  # nginx's access log is the ground truth for "what failed for users".
  local log="docker/nginx/logs/access.log"
  if [[ -f "$log" ]]; then
    local failed
    failed="$(tail -n 20000 "$log" | awk '$7 ~ /^\/(uploads|_next\/image)/ && $9 >= 400 {print $9, $7}')"
    if [[ -z "$failed" ]]; then
      pass "no failed image requests in the last 20k nginx log lines"
    else
      fail "$(printf '%s\n' "$failed" | wc -l) failed image requests (status, path) — most common:"
      printf '%s\n' "$failed" | sort | uniq -c | sort -rn | head -15 | while read -r line; do info "$line"; done
    fi
  else
    warn "no nginx access log at $log"
  fi

  if [[ -f docker/nginx/logs/error.log ]]; then
    local errors
    errors="$(tail -n 2000 docker/nginx/logs/error.log | grep -iE 'uploads|open\(\)|No such file|permission denied' | tail -8)"
    if [[ -n "$errors" ]]; then
      warn "nginx error log mentions uploads/files:"
      printf '%s\n' "$errors" | while read -r line; do info "${line:0:200}"; done
    else
      pass "nginx error log: nothing about uploads"
    fi
  fi

  # App errors from the last 24h, minus the harmless post-deploy noise from
  # tabs still running the previous build ("Failed to find Server Action").
  local app_errors
  app_errors="$(dc logs --since 24h --no-color app | grep -iE 'error|upstream image|ENOENT|EACCES|cloudinary|⨯' | grep -v 'Failed to find Server Action' | tail -15)"
  if [[ -n "$app_errors" ]]; then
    warn "app errors in the last 24h (latest 15):"
    printf '%s\n' "$app_errors" | while read -r line; do info "${line:0:220}"; done
  else
    pass "no app errors in the last 24h"
  fi
}

# ===========================================================================
case "$SECTION" in
  images) check_config; check_storage; check_serving; check_database_urls; check_logs ;;
  logs)   check_logs ;;
  all)    check_stack; check_config; check_storage; check_serving; check_database_urls; check_logs ;;
  *)      echo "Usage: $0 [all|images|logs]"; exit 2 ;;
esac

section "Summary"
printf '  %d failure(s), %d warning(s)\n' "$FAILURES" "$WARNINGS"
printf '  Full report saved to: %s\n' "$REPORT"
printf '  Paste that file back to share the results.\n'
