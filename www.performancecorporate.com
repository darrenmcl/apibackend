server {
    server_name www.performancecorporate.com performancecorporate.com;
    
    root /var/projects/my-astro-frontend/dist/;  # Update with your actual static files path
    access_log /var/log/nginx/pcorp.access.log;
    error_log /var/log/nginx/pcorp.error.log;
    index index.html;
    
    # Security headers
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options SAMEORIGIN;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' https://js.stripe.com https://m.stripe.network https://www.googletagmanager.com https://c.clarity.ms https://*.clarity.ms; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://*.stripe.com https://assets.performancecorporate.com https://placehold.co https://c.clarity.ms; font-src 'self'; frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://m.stripe.network; connect-src 'self' https://api.stripe.com https://m.stripe.network https://analytics.google.com https://*.google-analytics.com https://*.clarity.ms; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests;" always;
    location / {
        # Remove the /api prefix before forwarding
        rewrite ^/api(/.*)$ $1 break;
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
    
    # Static files caching
    location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
        expires 7d;
        add_header Cache-Control "public, max-age=604800";
    }

    # Secure RabbitMQ with IP restriction and/or auth
    location /rabbitmq/ {
        # Only allow specific IPs - adjust to your needs
        allow 127.0.0.1;        # localhost
        # allow your.office.ip;  # Add your office IP
        deny all;              # Deny everyone else
        
        # Rewrite path
        rewrite ^/rabbitmq/(.*)$ /$1 break;
        proxy_pass http://localhost:15672;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    listen 443 ssl;
    listen [::]:443 ssl;
    
    # Update these to match your domain or obtain new certificates
    
    # SSL optimization
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:10m;

    ssl_certificate /etc/letsencrypt/live/performancecorporate.com/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/performancecorporate.com/privkey.pem; # managed by Certbot

}

server {
    if ($host = www.performancecorporate.com) {
        return 301 https://$host$request_uri;
    } # managed by Certbot


    if ($host = performancecorporate.com) {
        return 301 https://$host$request_uri;
    } # managed by Certbot


    listen 80;
    listen [::]:80;
    server_name www.performancecorporate.com performancecorporate.com;
    # Redirect all HTTP traffic to HTTPS
    return 301 https://$host$request_uri;




}
