# Solana CLI requires GLIBC 2.32+ (bullseye has 2.31). Use bookworm.
FROM debian:bookworm-slim

# Set non-interactive frontend for apt
ENV DEBIAN_FRONTEND=noninteractive

# Install required dependencies and Rust
RUN apt-get update && apt-get install -y \
    curl build-essential libssl-dev pkg-config nano \
    && curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Add Rust to PATH
ENV PATH="/root/.cargo/bin:$PATH"

# Verify Rust installation
RUN rustc --version

# Install Solana CLI and ensure a fixed path so later steps see `solana`
RUN curl -sSfL https://release.anza.xyz/stable/install | sh -s -- --data-dir /root/.local/share/solana stable \
    && SOLANA_BIN="$(find /root/.local/share/solana -name solana -type f 2>/dev/null | head -1)" \
    && test -n "$SOLANA_BIN" || (echo "solana binary not found" && find /root/.local/share/solana -type f 2>/dev/null | head -20 && exit 1) \
    && "$SOLANA_BIN" --version \
    && SOLANA_DIR="$(dirname "$SOLANA_BIN")" \
    && mkdir -p /root/.local/share/solana/install \
    && ln -sfn "$SOLANA_DIR" /root/.local/share/solana/install/bin

# Add Solana binaries to PATH
ENV PATH="/root/.local/share/solana/install/bin:$PATH"

# Set up Solana config for Devnet
RUN solana config set -ud

# Set working directory
WORKDIR /solana-token

# Default command to run a shell
CMD ["/bin/bash"]
