server {
    server_name www.performancecorporate.com performancecorporate.com;

    # For Node SSR builds, static assets are usually in dist/client/
    # Check your actual build output directory structure!
    root /var/projects/my-astro-frontend/dist/client/;
    access_log /var/log/nginx/pcorp.access.log proxied;
    error_log /var/log/nginx/pcorp.error.log error; # Log errors more verbosely

    # index index.html; # Often not needed when proxying the main location

    # Security headers (Keep yours)
    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options SAMEORIGIN always;
    add_header X-XSS-Protection "1; mode=block" always;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' https://js.stripe.com https://m.stripe.network https://www.googletagmanager.com https://c.clarity.ms *.clarity.ms; style-src 'self' 'unsafe-inline'; img-src 'self' data: *.stripe.com https://assets.performancecorporate.com https://placehold.co https://c.clarity.ms; font-src 'self'; frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://m.stripe.network; connect-src 'self' https://api.stripe.com https://m.stripe.network https://analytics.google.com *.google-analytics.com *.clarity.ms; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests;" always;

    # Location for static assets (served directly by Nginx)
    # Adjust regex as needed, especially for hashed assets in _astro
    location ~ ^(/_astro/|.*\.(jpg|jpeg|png|gif|ico|css|js|svg|webp|woff|woff2))$ {
        # This tells Nginx to try and serve the file directly from the root defined above.
        # If not found, it returns a 404.
        try_files $uri =404;
        expires 7d;
        add_header Cache-Control "public, max-age=604800";
        access_log off; # Optional: Turn off logging for static assets
    }

    # Location for the application (proxied to the production Node server)
    location / {
        # Ensure your production server (node ./dist/server/entry.mjs) is running on this port!
        proxy_pass http://localhost:4321;
        
        # Keep existing proxy headers
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade'; # Important for WebSockets if used by Astro/your app
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }


    # Add this block to handle API requests
    location /api {
        # Proxy API requests to your actual backend service
        # Ensure store.performancecorporate.com is the correct API endpoint URL
        proxy_pass https://store.performancecorporate.com;

        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';

        # Important: Set the Host header correctly for the backend API
        # Usually, you want the host the backend expects. Test which one works.
        proxy_set_header Host store.performancecorporate.com; # Or maybe $host;

        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # You might need CORS headers here if the API backend doesn't set them sufficiently,
        # but often the backend handles CORS itself. Add if you get CORS errors later.
        # add_header 'Access-Control-Allow-Origin' 'https://www.performancecorporate.com' always;
        # add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        # add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type, X-Requested-With' always;
        # # Handle OPTIONS preflight requests if needed
        # if ($request_method = 'OPTIONS') {
        #    add_header 'Access-Control-Allow-Origin' 'https://www.performancecorporate.com';
        #    add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS';
        #    add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type, X-Requested-With';
        #    add_header 'Access-Control-Max-Age' 1728000;
        #    add_header 'Content-Type' 'text/plain charset=UTF-8';
        #    add_header 'Content-Length' 0;
        #    return 204;
        # }
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
