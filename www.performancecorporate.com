# Redirect non-www HTTP to https://www.performancecorporate.com
server {
    listen 80;
    listen [::]:80;
    server_name performancecorporate.com;
    return 301 https://www.performancecorporate.com$request_uri;
}

# Redirect non-www HTTPS to https://www.performancecorporate.com
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name performancecorporate.com;
    ssl_certificate /etc/letsencrypt/live/performancecorporate.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/performancecorporate.com/privkey.pem;
    return 301 https://www.performancecorporate.com$request_uri;
}

# Main app: https://www.performancecorporate.com
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name www.performancecorporate.com;
    root /var/projects/my-astro-frontend/dist/client/;
    access_log /var/log/nginx/pcorp.access.log proxied;
    error_log /var/log/nginx/pcorp.error.log error;
    
    # Security headers
    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options SAMEORIGIN always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # CSP (Updated to allow chat, fonts, and analytics)
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://m.stripe.network https://js.stripe.com https://www.googletagmanager.com https://www.google-analytics.com https://tagmanager.google.com https://www.clarity.ms https://*.clarity.ms; style-src 'self' 'unsafe-inline' https://tagmanager.google.com https://fonts.googleapis.com; img-src 'self' data: https://*.stripe.com https://assets.performancecorporate.com https://placehold.co https://c.clarity.ms https://c.bing.com https://www.googletagmanager.com https://www.google-analytics.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://*.stripe.com https://store.performancecorporate.com https://www.google-analytics.com https://analytics.google.com https://stats.g.doubleclick.net https://*.clarity.ms; frame-src 'self' https://*.stripe.com https://js.stripe.com https://*.doubleclick.net https://td.doubleclick.net; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'; upgrade-insecure-requests;";    
    # Static assets
    location ~ ^(/_astro/|.*\.(jpg|jpeg|png|gif|ico|css|js|svg|webp|woff|woff2))$ {
        try_files $uri =404;
        expires 7d;
        add_header Cache-Control "public, max-age=604800";
        access_log off;
    }
    
    # Application routing
    location / {
        proxy_pass http://localhost:4321;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # API proxy to backend
    location /api {
        proxy_pass https://store.performancecorporate.com;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host store.performancecorporate.com;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    ssl_certificate /etc/letsencrypt/live/performancecorporate.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/performancecorporate.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:10m;
}
