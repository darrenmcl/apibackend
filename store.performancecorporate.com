server {
    server_name store.performancecorporate.com;
    
    #root /var/projects/thestore/.medusa/server/public/admin/;
    access_log /var/log/nginx/pstore.access.log;
    error_log /var/log/nginx/pstore.error.log;
    index index.html;

    location / {
    # Remove the /api prefix before forwarding
    rewrite ^/api(/.*)$ $1 break;
    proxy_pass http://localhost:3012;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    location = /webhook/stripe {
    proxy_pass http://localhost:3012;
    proxy_request_buffering off;

    # Preserve critical headers
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Content-Type $http_content_type;
    proxy_set_header Content-Length $http_content_length;
    proxy_set_header Accept-Encoding "";
    }


    location /rabbitmq/ {
    proxy_pass http://localhost:15672/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;

    # Protect with HTTP Basic Auth
    auth_basic "Restricted RabbitMQ";
    auth_basic_user_file /etc/nginx/.htpasswd;
    }
}
#    listen [::]:443 ssl ipv6only=on; # managed by Certbot
    listen 443 ssl; # managed by Certbot

    ssl_certificate /etc/letsencrypt/live/store.performancecorporate.com/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/store.performancecorporate.com/privkey.pem; # managed by Certbot
}

server {
    if ($host = store.performancecorporate.com) {
        return 301 https://$host$request_uri;
    } # managed by Certbot


    listen 80;
    listen [::]:80;
    server_name store.performancecorporate.com;

    # Redirect all HTTP traffic to HTTPS
    return 301 https://$host$request_uri;
}
