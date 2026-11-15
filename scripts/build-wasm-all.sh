#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROFILE="${1:-release}"
ONLY="${2:-all}" # all | mln | exp

if [[ ! -d "$ROOT/engines/maplibre-rs-experimental" || ! -d "$ROOT/engines/mln-rs" ]]; then
  if [[ -d "$ROOT/../maplibre-rs-experimental" && -d "$ROOT/../mln-rs" ]]; then
    "$ROOT/scripts/sync-engines.sh" local
  else
    "$ROOT/scripts/sync-engines.sh" remote
  fi
fi

EXP_DIR="$ROOT/engines/maplibre-rs-experimental"
MLN_DIR="$ROOT/engines/mln-rs"
OUT_DIR="$ROOT/web-arena/public/wasm"
mkdir -p "$OUT_DIR/mln/pkg/webgl" "$OUT_DIR/exp-st" "$OUT_DIR/exp-mt"

ensure_wasm_bindgen() {
  local manifest="$1"
  local req
  req="$(grep -E '^wasm-bindgen\s*=' "$manifest" | head -n1 | sed -E 's/.*"=?([0-9]+\.[0-9]+\.[0-9]+)".*/\1/')"
  if [[ -z "$req" ]]; then
    req="0.2.130"
  fi
  if command -v wasm-bindgen >/dev/null 2>&1 && [[ "$(wasm-bindgen --version)" == "wasm-bindgen $req" ]]; then
    return 0
  fi
  local cache_bin="$HOME/.cache/arena-wasm-bindgen/$req/bin"
  if [[ -x "$cache_bin/wasm-bindgen" ]]; then
    export PATH="$cache_bin:$PATH"
    return 0
  fi
  echo "Installing wasm-bindgen-cli $req into $cache_bin ..."
  mkdir -p "$HOME/.cache/arena-wasm-bindgen/$req"
  cargo install --locked --root "$HOME/.cache/arena-wasm-bindgen/$req" wasm-bindgen-cli --version "$req"
  export PATH="$cache_bin:$PATH"
}

if [[ "$ONLY" == "all" || "$ONLY" == "mln" ]]; then
  echo "=== [1/2] Building mln-rs WASM (unmodified upstream) ==="
  ensure_wasm_bindgen "$MLN_DIR/Cargo.toml"
  (
    cd "$MLN_DIR"
    export CARGO_TARGET_DIR="${MLN_WASM_TARGET_DIR:-$ROOT/.cache/mln-wasm-target}"
    if [[ "$PROFILE" == "release" ]]; then
      export CARGO_PROFILE_RELEASE_OPT_LEVEL=s
      CARGO_PROF="release"
      TARGET_SUB="release"
    else
      CARGO_PROF="dev"
      TARGET_SUB="debug"
    fi

    cargo build --profile "$CARGO_PROF" --target wasm32-unknown-unknown -p mln-rs-web -p mln-rs-web-shaper
    wasm-bindgen --target web --out-dir "$OUT_DIR/mln/pkg" "$CARGO_TARGET_DIR/wasm32-unknown-unknown/$TARGET_SUB/mln_web.wasm"
    wasm-bindgen --target web --out-dir "$OUT_DIR/mln/pkg" "$CARGO_TARGET_DIR/wasm32-unknown-unknown/$TARGET_SUB/mln_web_shaper.wasm"

    cargo build --profile "$CARGO_PROF" --target wasm32-unknown-unknown -p mln-rs-web --features webgl
    wasm-bindgen --target web --out-dir "$OUT_DIR/mln/pkg/webgl" "$CARGO_TARGET_DIR/wasm32-unknown-unknown/$TARGET_SUB/mln_web.wasm"

    if [[ "$PROFILE" == "release" ]] && command -v wasm-opt >/dev/null 2>&1; then
      for w in "$OUT_DIR/mln/pkg/mln_web_bg.wasm" "$OUT_DIR/mln/pkg/mln_web_shaper_bg.wasm" "$OUT_DIR/mln/pkg/webgl/mln_web_bg.wasm"; do
        wasm-opt -Oz --converge --one-caller-inline-max-function-size=20 --zero-filled-memory --low-memory-unused \
          --strip-debug --strip-producers --strip-target-features "$w" -o "$w"
      done
    fi
  )
fi

if [[ "$ONLY" == "all" || "$ONLY" == "exp" ]]; then
  echo "=== [2/2] Building maplibre-rs-experimental WASM (ST + MT with arena-telemetry) ==="
  ensure_wasm_bindgen "$EXP_DIR/Cargo.toml"
  (
    cd "$EXP_DIR/web/lib"
    npm ci --no-audit --no-fund || npm install --no-audit --no-fund
    EXTRA_FLAGS="--esm"
    if [[ "$PROFILE" == "release" ]]; then
      EXTRA_FLAGS="--release $EXTRA_FLAGS"
    fi
    TELEMETRY_ENABLED="false"
    if grep -q "arena-telemetry" build.mjs; then
      EXTRA_FLAGS="$EXTRA_FLAGS --arena-telemetry"
      TELEMETRY_ENABLED="true"
    else
      echo "note: --arena-telemetry not found in $EXP_DIR/web/lib/build.mjs; building standard bundle"
    fi

    # shellcheck disable=SC2086
    RUSTUP_TOOLCHAIN=nightly node build.mjs $EXTRA_FLAGS
    rm -rf "$OUT_DIR/exp-st" && mkdir -p "$OUT_DIR/exp-st/assets"
    cp dist/esbuild-esm/module.js "$OUT_DIR/exp-st/module.js"
    cp src/wasm/maplibre_bg.wasm "$OUT_DIR/exp-st/assets/maplibre_bg.wasm"

    # shellcheck disable=SC2086
    RUSTUP_TOOLCHAIN=nightly node build.mjs $EXTRA_FLAGS --multithreaded
    rm -rf "$OUT_DIR/exp-mt" && mkdir -p "$OUT_DIR/exp-mt/assets"
    cp dist/esbuild-esm/module.js "$OUT_DIR/exp-mt/module.js"
    cp src/wasm/maplibre_bg.wasm "$OUT_DIR/exp-mt/assets/maplibre_bg.wasm"
    echo "$TELEMETRY_ENABLED" > "$OUT_DIR/.exp_telemetry"
  )
fi

echo "=== Writing public/wasm/manifest.json ==="
EXP_SHA="$(git -C "$EXP_DIR" rev-parse --short=10 HEAD)"
MLN_SHA="$(git -C "$MLN_DIR" rev-parse --short=10 HEAD)"

python3 - "$OUT_DIR" "$EXP_SHA" "$MLN_SHA" "$PROFILE" <<'PY'
import gzip, json, os, sys, time

out_dir, exp_sha, mln_sha, profile = sys.argv[1:5]

def stats_for(rel_path):
    full = os.path.join(out_dir, rel_path)
    if not os.path.exists(full):
        return None
    data = open(full, "rb").read()
    gz = len(gzip.compress(data, compresslevel=9))
    return {"path": f"/wasm/{rel_path}", "rawBytes": len(data), "gzipBytes": gz}

manifest = {
    "builtAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    "profile": profile,
    "commits": {
        "maplibreRsExperimental": exp_sha,
        "mlnRs": mln_sha,
    },
    "bundles": {
        "mln-webgpu": stats_for("mln/pkg/mln_web_bg.wasm"),
        "mln-shaper": stats_for("mln/pkg/mln_web_shaper_bg.wasm"),
        "mln-webgl2": stats_for("mln/pkg/webgl/mln_web_bg.wasm"),
        "exp-st": stats_for("exp-st/assets/maplibre_bg.wasm"),
        "exp-mt": stats_for("exp-mt/assets/maplibre_bg.wasm"),
    },
}
with open(os.path.join(out_dir, "manifest.json"), "w", encoding="utf-8") as f:
    json.dump(manifest, f, indent=2)
print(json.dumps(manifest, indent=2))
PY
