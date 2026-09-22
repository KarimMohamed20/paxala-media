#!/bin/bash

# ============================================
# certbot deploy hook: publish a renewed certificate to nginx
# ============================================
#
# nginx does not read /etc/letsencrypt. It reads COPIES in docker/nginx/ssl,
# mounted into the container. So a renewal changes nothing users see until
# the new files are copied over and nginx reloads — this script does both.
#
# certbot runs every executable in /etc/letsencrypt/renewal-hooks/deploy/
# after it renews a certificate, with RENEWED_LINEAGE set to that
# certificate's live/ directory. Install once on the server:
#
#   ln -sf /var/www/paxala-media/scripts/cert-deploy-hook.sh \
#          /etc/letsencrypt/renewal-hooks/deploy/paxala-nginx.sh
#
# Run by hand after issuing a certificate outside `certbot renew`:
#
#   RENEWED_LINEAGE=/etc/letsencrypt/live/paxaland.com scripts/cert-deploy-hook.sh
#
# Fails loudly: certbot logs a failing hook, and a half-installed
# certificate — new chain, old key — must never be reloaded into nginx.

set -euo pipefail

SSL_DIR="/var/www/paxala-media/docker/nginx/ssl"
lineage="${RENEWED_LINEAGE:?set by certbot; by hand, set it to /etc/letsencrypt/live/<name>}"

# File names default.conf expects for each certificate.
case "$(basename "$lineage")" in
  paxaland.com)    prefix="" ;;
  paxalamedia.com) prefix="paxalamedia-" ;;
  *)
    echo "cert-deploy-hook: no nginx mapping for $lineage, skipping"
    exit 0
    ;;
esac

# Stage both files, then move them into place. A failure part-way (disk full,
# missing file) leaves the old pair intact instead of a new chain beside the
# old key — a mismatch nginx refuses to start with on its next restart.
# (The directory is bind-mounted, so the container sees the renamed files.)
install -m 644 "$lineage/fullchain.pem" "$SSL_DIR/.${prefix}fullchain.pem.new"
install -m 600 "$lineage/privkey.pem" "$SSL_DIR/.${prefix}privkey.pem.new"
mv -f "$SSL_DIR/.${prefix}fullchain.pem.new" "$SSL_DIR/${prefix}fullchain.pem"
mv -f "$SSL_DIR/.${prefix}privkey.pem.new" "$SSL_DIR/${prefix}privkey.pem"

# Validate before reloading: a reload with a broken config is refused by
# nginx anyway, but `-t` puts the reason in certbot's log.
docker exec pmp_nginx nginx -t
docker exec pmp_nginx nginx -s reload

echo "cert-deploy-hook: installed $(basename "$lineage"), valid until $(openssl x509 -noout -enddate -in "$SSL_DIR/${prefix}fullchain.pem" | cut -d= -f2)"
