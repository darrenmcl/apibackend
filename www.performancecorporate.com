server {
    server_name www.performancecorporate.com performancecorporate.com;
    
    #root /var/projects/thestore/.medusa/server/public/admin/;
    access_log /var/log/nginx/pcorp.access.log;
    error_log /var/log/nginx/pcorp.error.log;
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

   # Add this location block for RabbitMQ Management UI
    location /rabbitmq/ {
        # Rewrite the path to remove /rabbitmq/ before passing to the backend UI
        rewrite ^/rabbitmq/(.*)$ /$1 break;

        proxy_pass http://localhost:15672; # Forward to the management UI port

        # Standard proxy headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Headers required for WebSocket support in RabbitMQ UI
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";

        # Optional: Increase timeouts if UI operations take longer
        # proxy_connect_timeout       60s;
        # proxy_send_timeout          60s;
        # proxy_read_timeout          60s;
    }


}
#    listen [::]:443 ssl ipv6only=on; # managed by Certbot
    listen 443 ssl; # managed by Certbot

    ssl_certificate /etc/letsencrypt/live/store.performancecorporate.com/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/store.performancecorporate.com/privkey.pem; # managed by Certbot
}

server {

    listen 80;
    listen [::]:80;
    server_name www.performancecorporate.com performancecorporate.com;

    # Redirect all HTTP traffic to HTTPS
    return 301 https://$host$request_uri;
}
