# =========================================================================
# CLOUDEXCHANGE AUTOMATED DEPLOYMENT SCRIPT (deploy.ps1)
# =========================================================================
# Designed to build and deploy to AWS EC2: 43.205.232.106 in Mumbai

$ErrorActionPreference = "Stop"
$IP = "43.205.232.106"
$PEM_PATH = "devops/terraform/cloudexchange-key.pem"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "Initializing Production Cloud Deployment..." -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# 1. Verification checks
if (-not (Test-Path $PEM_PATH)) {
    Write-Host "Error: SSH key pair file not found at $PEM_PATH" -ForegroundColor Red
    Exit
}

# 2. Creating deployment package (excluding heavy node_modules or build caches)
Write-Host "Compiling backend TypeScript..." -ForegroundColor Yellow
npx esbuild backend/server.ts --platform=node --target=node16 --outfile=backend/server.js --bundle --external:express --external:cors --external:ws --external:pg --external:nodemailer --log-level=warning

Write-Host "Compiling frontend Next.js statically..." -ForegroundColor Yellow
Push-Location frontend
npm run build
Pop-Location

Write-Host "Packaging workspace files..." -ForegroundColor Yellow
$TempDir = "deploy_temp"
if (Test-Path $TempDir) { Remove-Item -Recurse -Force $TempDir }
New-Item -ItemType Directory -Path $TempDir | Out-Null

# Copy required directories
Copy-Item -Path "backend" -Destination "$TempDir/backend" -Recurse -Force

# Copy frontend dist folder only (pre-built locally)
New-Item -ItemType Directory -Path "$TempDir/frontend/dist" -Force | Out-Null
Copy-Item -Path "frontend/dist/*" -Destination "$TempDir/frontend/dist" -Recurse -Force

# Copy admin-panel (excluding node_modules, dist)
New-Item -ItemType Directory -Path "$TempDir/admin-panel" -Force | Out-Null
Get-ChildItem -Path "admin-panel" -Force | Where-Object { $_.Name -ne "node_modules" -and $_.Name -ne "dist" } | ForEach-Object {
    Copy-Item -Path $_.FullName -Destination "$TempDir/admin-panel/" -Recurse -Force
}

# Copy goldchain-cli (excluding node_modules)
New-Item -ItemType Directory -Path "$TempDir/goldchain-cli" -Force | Out-Null
Get-ChildItem -Path "goldchain-cli" -Force | Where-Object { $_.Name -ne "node_modules" } | ForEach-Object {
    Copy-Item -Path $_.FullName -Destination "$TempDir/goldchain-cli/" -Recurse -Force
}

# Copy goldchain-l1 (excluding target, target_final_all, node_modules)
New-Item -ItemType Directory -Path "$TempDir/goldchain-l1" -Force | Out-Null
Get-ChildItem -Path "goldchain-l1" -Force | Where-Object { $_.Name -ne "target" -and $_.Name -ne "target_final_all" -and $_.Name -ne "node_modules" } | ForEach-Object {
    Copy-Item -Path $_.FullName -Destination "$TempDir/goldchain-l1/" -Recurse -Force
}

# Cleanup heavy or sensitive terraform files before zipping
$TfDir = "$TempDir/goldchain-l1/devops/terraform"
if (Test-Path "$TfDir/.terraform") { Remove-Item -Recurse -Force "$TfDir/.terraform" }
if (Test-Path "$TfDir/terraform.tfstate") { Remove-Item -Force "$TfDir/terraform.tfstate" }
if (Test-Path "$TfDir/terraform.tfstate.backup") { Remove-Item -Force "$TfDir/terraform.tfstate.backup" }
if (Test-Path "$TfDir/cloudexchange-key.pem") { Remove-Item -Force "$TfDir/cloudexchange-key.pem" }

Copy-Item -Path ".env" -Destination "$TempDir/.env" -Force
Copy-Item -Path "package.json" -Destination "$TempDir/package.json" -Force


# Create ZIP archive
$ZipPath = "cloudexchange-deploy.zip"
if (Test-Path $ZipPath) { Remove-Item -Force $ZipPath }
Compress-Archive -Path "$TempDir/*" -DestinationPath $ZipPath

# Cleanup temporary folder safely
try {
    if (Test-Path $TempDir) { Remove-Item -Recurse -Force $TempDir }
} catch {
    Write-Host "Warning: Temporary folder cleanup failed: $_" -ForegroundColor Yellow
}

# 3. Uploading files to AWS EC2
Write-Host "Uploading deployment archive to AWS EC2..." -ForegroundColor Yellow
scp -o StrictHostKeyChecking=no -i $PEM_PATH $ZipPath "ubuntu@$IP`:/home/ubuntu/"
scp -o StrictHostKeyChecking=no -i $PEM_PATH "deploy.sh" "ubuntu@$IP`:/home/ubuntu/"

# Cleanup local ZIP
Remove-Item -Force $ZipPath

# 4. SSH Remote Commands Execution
Write-Host "Executing remote installation or deployment configuration..." -ForegroundColor Yellow
ssh -o StrictHostKeyChecking=no -i $PEM_PATH "ubuntu@$IP" "chmod +x /home/ubuntu/deploy.sh"
ssh -o StrictHostKeyChecking=no -i $PEM_PATH "ubuntu@$IP" "/home/ubuntu/deploy.sh"

Write-Host "==================================================" -ForegroundColor Green
Write-Host "SUCCESS! CloudExchange is now Live on AWS EC2!" -ForegroundColor Green
Write-Host "Web App Domain: http://cloudexchange.in" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
