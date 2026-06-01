# =========================================================================
# 🚀 CLOUDEXCHANGE AUTOMATED DEPLOYMENT SCRIPT (deploy.ps1)
# =========================================================================
# Designed to build and deploy to AWS EC2: 13.233.16.228 in Mumbai

$ErrorActionPreference = "Stop"
$IP = "43.205.232.106"
$PEM_PATH = "devops/terraform/cloudexchange-key.pem"
$REMOTE_DIR = "/var/www/cloud-exchange"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "⚡ Initializing Production Cloud Deployment..." -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# 1. Verification checks
if (-not (Test-Path $PEM_PATH)) {
    Write-Host "❌ Error: SSH key pair file not found at $PEM_PATH" -ForegroundColor Red
    Exit
}

# 2. Creating deployment package (excluding heavy node_modules o build caches)
Write-Host "📦 Packaging workspace files (excluding target/node_modules)..." -ForegroundColor Yellow
$TempDir = "deploy_temp"
if (Test-Path $TempDir) { Remove-Item -Recurse -Force $TempDir }
New-Item -ItemType Directory -Path $TempDir | Out-Null

# Copy required directories
Copy-Item -Path "backend" -Destination "$TempDir/backend" -Recurse -Force
Copy-Item -Path "frontend" -Destination "$TempDir/frontend" -Recurse -Force -Exclude "node_modules", ".next"
Copy-Item -Path "admin-panel" -Destination "$TempDir/admin-panel" -Recurse -Force -Exclude "node_modules", "dist"
Copy-Item -Path "goldchain-l1" -Destination "$TempDir/goldchain-l1" -Recurse -Force -Exclude "target", "node_modules"
Copy-Item -Path ".env" -Destination "$TempDir/.env" -Force
Copy-Item -Path "package.json" -Destination "$TempDir/package.json" -Force

# Create ZIP archive
$ZipPath = "cloudexchange-deploy.zip"
if (Test-Path $ZipPath) { Remove-Item -Force $ZipPath }
Compress-Archive -Path "$TempDir/*" -DestinationPath $ZipPath

# Cleanup temporary folder
Remove-Item -Recurse -Force $TempDir

# 3. Uploading to AWS EC2
Write-Host "🚀 Uploading archive to AWS EC2 Server ($IP)..." -ForegroundColor Yellow
scp -o StrictHostKeyChecking=no -i $PEM_PATH $ZipPath "ubuntu@$IP`:/home/ubuntu/"

# Cleanup local ZIP
Remove-Item -Force $ZipPath

# 4. SSH Remote Commands (Unzipping, npm installing, configuring Nginx, launching Docker BFT and API)
Write-Host "🖥️ Executing remote installation o deployment configuration..." -ForegroundColor Yellow

$RemoteCommands = @"
set -e
echo '🧹 Cleaning remote target directory...'
sudo mkdir -p $REMOTE_DIR
sudo chown -R ubuntu:ubuntu $REMOTE_DIR

echo '📦 Extracting files...'
unzip -o /home/ubuntu/cloudexchange-deploy.zip -d $REMOTE_DIR
rm -f /home/ubuntu/cloudexchange-deploy.zip

echo '🛠️ Installing Node.js root and backend dependencies...'
cd $REMOTE_DIR
npm install --production

echo '⛓️ Bootstrapping GoldChain L1 Blockchain Nodes (Docker BFT Mesh)...'
cd $REMOTE_DIR/goldchain-l1/devops
sudo ./bootstrap.sh

echo '🚀 Starting Backend API Server via PM2...'
cd $REMOTE_DIR
pm2 delete server || true
pm2 start backend/server.ts --interpreter=ts-node --name "server"
pm2 save

echo '🌐 Configuring Nginx reverse proxy routing...'
sudo tee /etc/nginx/sites-available/cloudexchange.conf > /dev/null <<'NGINX'
server {
    listen 80;
    server_name cloudexchange.in www.cloudexchange.in;

    # Backend API Routing
    location /api/ {
        proxy_pass http://127.0.0.1:3002/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }

    # Next.js Frontend Routing (mocking port 3000)
    location / {
        proxy_pass http://127.0.0.1:3000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
NGINX

sudo ln -sf /etc/nginx/sites-available/cloudexchange.conf /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default || true
sudo systemctl restart nginx

echo '✅ Remote deployment complete!'
"@

# Run commands on remote EC2 over SSH
ssh -o StrictHostKeyChecking=no -i $PEM_PATH "ubuntu@$IP" $RemoteCommands

Write-Host "==================================================" -ForegroundColor Green
Write-Host "🎉 SUCCESS! CloudExchange is now Live on AWS EC2!" -ForegroundColor Green
Write-Host "🔗 Web App Domain: http://cloudexchange.in" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
