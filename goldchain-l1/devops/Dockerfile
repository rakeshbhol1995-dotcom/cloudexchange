# =========================================================================
# 🐳 GOLDFIELD L1 BLOCKCHAIN NODE CONTAINERIZATION ENGINE (Dockerfile)
# =========================================================================

# Stage 1: Optimized Cargo Workspace Compilation
FROM rust:1.88-slim AS builder
WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*

# Copy local source code and workspace configurations
COPY . .

# Compile production-ready optimized node executable
RUN cargo build --release --bin node

# Stage 2: Secure Minimal Runtime Container
FROM debian:bookworm-slim
WORKDIR /app

# Install runtime security packages
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# Copy the compiled binary from Stage 1
COPY --from=builder /app/target/release/node /app/goldchain-node

# Expose live JSON-RPC port
EXPOSE 8545

# Default execution entrypoint
ENTRYPOINT ["/app/goldchain-node"]
