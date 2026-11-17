#!/usr/bin/env just --justfile

set shell := ["bash", "-eu", "-o", "pipefail", "-c"]

# Link local sibling checkouts ../maplibre-rs-experimental and ../mln-rs into engines/
sync-local:
    ./scripts/sync-engines.sh local

# Clone or fetch latest upstream commits (mln-rs pinned to baseline 0ca2ff95fb and stays 100% unmodified)
sync-remote EXP_REF="main" MLN_REF="0ca2ff95fb9026c7d0a4c3edaf6cb29dcdd1800d":
    ./scripts/sync-engines.sh remote "{{EXP_REF}}" "{{MLN_REF}}"

# Build WASM bundles for mln-rs (WebGPU + WebGL2 + Shaper) and maplibre-rs-experimental (ST + MT with arena-telemetry)
build-wasm PROFILE="release":
    ./scripts/build-wasm-all.sh "{{PROFILE}}" all

# Fast inner-loop: rebuild ONLY maplibre-rs-experimental WASM (ST + MT) while keeping mln-rs baseline cached
build-wasm-exp PROFILE="release":
    ./scripts/build-wasm-all.sh "{{PROFILE}}" exp

# Install web-arena dependencies
install-web:
    cd web-arena && npm install

# Start local Vite dev server at http://127.0.0.1:5173 (with COOP: same-origin & COEP: credentialless, no CF Worker)
dev:
    cd web-arena && npm run dev -- --host 127.0.0.1 --port 5173

# Build production static bundle into web-arena/dist
build-web:
    cd web-arena && npm run build

# Serve production local workbench at http://127.0.0.1:4173 (with COOP/COEP headers, zero Cloudflare dependency)
preview: build-web
    cd web-arena && npm run preview -- --host 127.0.0.1 --port 4173

# Deploy web-arena/dist to Cloudflare Workers Static Assets
deploy: build-web
    npx wrangler deploy

# Run native headless ABBA benchmark & conformance summary
native-bench *ARGS:
    cargo run --manifest-path native-arena/Cargo.toml --release -- {{ARGS}}

# Run 3-round interleaved WebGPU Arena ABBA benchmark suite across S1-S8
web-bench *ARGS: build-web
    node scripts/bench-web-abba.mjs {{ARGS}}

# Check native-arena compilation without executing heavy GPU loops
check-native:
    cargo check --manifest-path native-arena/Cargo.toml
