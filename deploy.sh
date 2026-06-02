#!/bin/bash
# =========================================================================
# 🚀 CLOUDEXCHANGE LINUX DEPLOYMENT SCRIPT (deploy.sh)
# =========================================================================
set -e

REMOTE_DIR="/var/www/cloud-exchange"

echo '🧹 Stopping and deleting PM2 instances to avoid file locks...'
pm2 delete server || true
pm2 save || true

echo '🧹 Cleaning remote target directory...'
sudo rm -rf $REMOTE_DIR
sudo mkdir -p $REMOTE_DIR
sudo chown -R ubuntu:ubuntu $REMOTE_DIR

echo '📦 Checking and installing unzip if missing...'
if ! command -v unzip &> /dev/null; then
    echo 'unzip not found. Installing...'
    sudo apt-get update && sudo apt-get install -y unzip
fi

echo '📦 Extracting files...'
unzip -o /home/ubuntu/cloudexchange-deploy.zip -d $REMOTE_DIR || true
sudo chown -R ubuntu:ubuntu $REMOTE_DIR
sudo chmod -R +X $REMOTE_DIR
rm -f /home/ubuntu/cloudexchange-deploy.zip

echo '🛠️ Installing Node.js root and backend dependencies...'
cd $REMOTE_DIR
npm install --production

# Install TypeScript and ts-node globally (legacy support, though running compiled server.js is preferred)
sudo npm install -g typescript ts-node || true

echo '⛓️ Bootstrapping GoldChain L1 Blockchain Nodes (Docker BFT Mesh)...'
cd $REMOTE_DIR/goldchain-l1/devops
chmod +x bootstrap.sh
sudo ./bootstrap.sh || true

echo '🚀 Starting Backend API Server via PM2...'
cd $REMOTE_DIR
pm2 delete server || true
pm2 start backend/server.js --name "server"
pm2 save

echo '🌐 Configuring Nginx reverse proxy routing...'
sudo tee /etc/nginx/sites-available/cloudexchange.conf > /dev/null <<'NGINX'
server {
    listen 80 default_server;
    server_name cloudexchange.in www.cloudexchange.in 43.205.232.106;

    # Backend API Routing
    location /api/ {
        proxy_pass http://127.0.0.1:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Next.js Frontend Routing (serving static files directly)
    location / {
        root /var/www/cloud-exchange/frontend/dist;
        index index.html;
        try_files $uri $uri/ $uri/index.html $uri.html /index.html;
    }
}
NGINX

sudo ln -sf /etc/nginx/sites-available/cloudexchange.conf /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default || true
sudo systemctl restart nginx

echo '✅ Remote deployment complete!'
