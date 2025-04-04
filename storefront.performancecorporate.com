server {
    server_name storefront.performancecorporate.com;
    root /var/projects/my-astro-frontend/dist;
    client_max_body_size 50M;
    access_log /var/log/nginx/pstorefront.access.log;
    error_log /var/log/nginx/pstorefront.error.log;
    index index.html;

    # listen directives and SSL config
    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/storefront.performancecorporate.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/storefront.performancecorporate.com/privkey.pem;
    # Other SSL settings...

    # Add Permissions Policy for Stripe payments
    # Strict Transport Security
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' https://js.stripe.com https://m.stripe.network https://www.googletagmanager.com https://c.clarity.ms https://*.clarity.ms; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://*.stripe.com assets.performancecorporate.com placehold.co; font-src 'self'; frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://m.stripe.network; connect-src 'self' https://api.stripe.com https://m.stripe.network https://analytics.google.com https://*.google-analytics.com https://*.clarity.ms ws://127.0.0.1:4321; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests;" always;    
    location / {
        proxy_pass http://127.0.0.1:4329;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

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
}

server {
    if ($host = storefront.performancecorporate.com) {
        return 301 https://$host$request_uri;
    } # managed by Certbot


    listen 80;
    listen [::]:80;
    server_name storefront.performancecorporate.com;

    # Redirect all HTTP traffic to HTTPS
    return 301 https://$host$request_uri;
}
