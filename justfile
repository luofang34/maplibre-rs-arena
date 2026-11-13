#!/usr/bin/env just --justfile

set shell := ["bash", "-euo pipefail", "-c"]

# Link local sibling checkouts ../maplibre-rs-experimental and ../mln-rs into engines/
sync-local:
    ./scripts/sync-engines.sh local

# Clone or fetch latest upstream commits (mln-rs stays 100% unmodified)
sync-remote EXP_REF="main" MLN_REF="main":
    ./scripts/sync-engines.sh remote "{{EXP_REF}}" "{{MLN_REF}}"

# Build WASM bundles for mln-rs (WebGPU + WebGL2 + Shaper) and maplibre-rs-experimental (ST + MT with arena-telemetry)
build-wasm PROFILE="release":
    ./scripts/build-wasm-all.sh "{{PROFILE}}"

# Install web-arena dependencies
install-web:
    cd web-arena && npm install

# Start local Vite dev server (with COOP: same-origin & COEP: credentialless)
dev:
    cd web-arena && npm run dev

# Build production static bundle into web-arena/dist
build-web:
    cd web-arena && npm run build

# Deploy web-arena/dist to Cloudflare Workers Static Assets
deploy: build-web
    npx wrangler deploy

# Run native headless ABBA benchmark & conformance summary
native-bench *ARGS:
    cargo run --manifest-path native-arena/Cargo.toml --release -- {{ARGS}}

# Check native-arena compilation without executing heavy GPU loops
check-native:
    cargo check --manifest-path native-arena/Cargo.toml
