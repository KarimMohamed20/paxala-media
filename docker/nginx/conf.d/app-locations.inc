# ============================================
# Application locations — shared by every HTTPS server block
# ============================================
#
# Included from both the paxaland.com and the paxalamedia.com server blocks
# in default.conf, so the two domains serve the same app the same way. They
# used to be separate copies, and the paxalamedia.com copy had drifted: no
# /uploads/ alias, no playground streaming block, and redirects that sent
# every portal page to the other domain.
#
# The `.inc` extension is load-bearing: nginx.conf includes conf.d/*.conf at
# http level, where these server-level directives would be a startup error.

# Static file uploads (served directly by nginx for better performance)
# Maps https://<domain>/uploads/* to /var/www/paxala-media/public/uploads/*
location /uploads/ {
    alias /var/www/paxala-media/public/uploads/;
    expires 30d;
    add_header Cache-Control "public, immutable";
    add_header Access-Control-Allow-Origin "*";
    try_files $uri =404;
}

# Next.js static files
location /_next/static/ {
    set $upstream_app app:3000;
    proxy_pass http://$upstream_app;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    expires 365d;
    add_header Cache-Control "public, immutable";
}

# Public static files
location /images/ {
    set $upstream_app app:3000;
    proxy_pass http://$upstream_app;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    expires 30d;
    add_header Cache-Control "public, max-age=2592000";
}

# PMP Playground: live collaboration (SSE stream + batched canvas ops).
#
# nginx selects the LONGEST matching prefix, so this wins over `location /api/`
# regardless of the order the two blocks appear in.
#
# Three settings here are load-bearing, and every one of them fails INVISIBLY
# in development — `next dev` has no nginx at all, and docker-compose
# publishes the app on :3000, which bypasses this proxy entirely. The stream
# must be verified through https on 443 or it has not been verified.
#
#   proxy_buffering off   nginx buffers proxied responses by default, so
#                         without this every SSE frame sits in a buffer and
#                         the room looks frozen until the buffer fills. The
#                         app also sends `X-Accel-Buffering: no`, which nginx
#                         honours because `proxy_ignore_headers` is unset —
#                         this line is the belt to that braces.
#   proxy_read_timeout    a healthy stream is idle between events. The app
#                         heartbeats every 20s and recycles the connection at
#                         15 minutes; 900s comfortably contains both.
#   Connection ""         the shared /api/ block forwards `Connection: upgrade`
#                         for websockets. SSE is a plain HTTP response, and
#                         an upgrade header on it confuses intermediaries.
location /api/playground/ {
    limit_req zone=playground burst=200 nodelay;
    limit_conn addr 60;

    # Variable + resolver like every other location: a static upstream
    # caches the app container's IP across redeploys and 502s silently.
    set $upstream_app app:3000;
    proxy_pass http://$upstream_app;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Request-ID $request_id;

    proxy_buffering off;
    proxy_cache off;
    gzip off;
    proxy_read_timeout 900s;
    proxy_connect_timeout 60s;
    proxy_send_timeout 900s;
}

# API routes with rate limiting
location /api/ {
    limit_req zone=api burst=50 nodelay;
    limit_conn addr 20;

    set $upstream_app app:3000;
    proxy_pass http://$upstream_app;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Request-ID $request_id;
    proxy_cache_bypass $http_upgrade;
    # Increased timeouts for large file uploads (1GB - 10 minutes)
    proxy_read_timeout 600s;
    proxy_connect_timeout 600s;
    proxy_send_timeout 600s;
}

# Health check endpoint (no rate limit)
location /api/health {
    set $upstream_app app:3000;
    proxy_pass http://$upstream_app;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    access_log off;
}

# Main application
location / {
    limit_req zone=general burst=20 nodelay;
    limit_conn addr 10;

    set $upstream_app app:3000;
    proxy_pass http://$upstream_app;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Request-ID $request_id;
    proxy_cache_bypass $http_upgrade;
    # Increased timeouts for large file uploads (1GB - 10 minutes)
    proxy_read_timeout 600s;
    proxy_connect_timeout 600s;
    proxy_send_timeout 600s;

    # Handle errors gracefully
    proxy_intercept_errors on;
    error_page 502 503 504 /50x.html;
}

# Error pages
location = /50x.html {
    root /usr/share/nginx/html;
    internal;
}

# Deny access to hidden files
location ~ /\. {
    deny all;
    access_log off;
    log_not_found off;
}
