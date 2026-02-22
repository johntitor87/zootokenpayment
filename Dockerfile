# Solana CLI requires GLIBC 2.32+ (bullseye has 2.31). Use bookworm.
FROM debian:bookworm-slim

# Set non-interactive frontend for apt
ENV DEBIAN_FRONTEND=noninteractive

# Install required dependencies
RUN apt-get update && apt-get install -y \
    curl build-essential libssl-dev pkg-config nano \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Install Rust
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y && \
    echo 'source $HOME/.cargo/env' >> /root/.bashrc && \
    . $HOME/.cargo/env

# Rust environment for all subsequent RUN/CMD
ENV PATH="/root/.cargo/bin:$PATH"
ENV RUSTUP_HOME="/root/.rustup"
ENV CARGO_HOME="/root/.cargo"

# Solana CLI: one RUN only. Args: --data-dir <path> then release (stable).
RUN curl -sSfL https://release.anza.xyz/stable/install | sh -s -- --data-dir /root/.local/share/solana stable

ENV PATH="/root/.local/share/solana/install/active_release/bin:$PATH"

# Verify Solana CLI installation
RUN solana --version

# Set up Solana config for Devnet
RUN solana config set -ud

# Set working directory
WORKDIR /solana-token

# Default command to run a shell
CMD ["/bin/bash"]
