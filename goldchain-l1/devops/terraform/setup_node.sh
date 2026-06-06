#!/bin/bash
# =========================================================================
# 🚀 GOLDFIELD L1 BLOCKCHAIN NODE EC2 BOOTSTRAPPER (systemd-native setup_node.sh)
# =========================================================================
set -e

echo "=== Starting GoldChain L1 Validator Setup (Without Docker - Native systemd) ==="

# 1. Update system and install build dependencies
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y
apt-get install -y curl git build-essential pkg-config libssl-dev ca-certificates

# 2. Install Rust / Cargo natively
echo "🦀 Installing Rust Toolchain..."
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source "$HOME/.cargo/env"

# 3. Create app configurations directories
mkdir -p /etc/goldchain
mkdir -p /var/lib/goldchain

# 4. Write validator config.json from template values
cat << 'EOF' > /etc/goldchain/config.json
{
  "private_key": "${private_key}",
  "peers": ${peers_json},
  "active_validators": ${active_validators_json}
}
EOF

# 5. Clone and compile the blockchain node code
echo "🏗️ Cloning and compiling GoldChain L1 workspace..."
cd /tmp
git clone https://github.com/rakeshabhol/goldchain-l1.git || true # Clone repository
cd goldchain-l1
cargo build --release --bin node

# 6. Install the compiled binary
cp target/release/node /usr/local/bin/goldchain-node
chmod +x /usr/local/bin/goldchain-node

# 7. Create systemd system service for 24/7 background operation
echo "⚙️ Creating systemd service..."
cat << 'EOF' > /etc/systemd/system/goldchain.service
[Unit]
Description=GoldChain L1 Validator Node Service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/var/lib/goldchain
ExecStart=/usr/local/bin/goldchain-node --port 8545 --config /etc/goldchain/config.json
Restart=always
RestartSec=5
Environment=GOLDCHAIN_INSECURE_TLS=${insecure_tls}

[Install]
WantedBy=multi-user.target
EOF

# 8. Start and enable service to run on boot
systemctl daemon-reload
systemctl enable goldchain
systemctl start goldchain

echo "=== GoldChain L1 Validator Native systemd Setup Complete! ==="
