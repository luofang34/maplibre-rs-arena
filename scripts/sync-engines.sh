#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MODE="${1:-local}"
EXP_REF="${2:-main}"
MLN_REF="${3:-main}"

mkdir -p "$ROOT/engines"

if [[ "$MODE" == "local" ]]; then
  LOCAL_EXP="${LOCAL_EXP_PATH:-$ROOT/../maplibre-rs-experimental}"
  LOCAL_MLN="${LOCAL_MLN_PATH:-$ROOT/../mln-rs}"

  if [[ ! -d "$LOCAL_EXP" ]]; then
    echo "error: local maplibre-rs-experimental not found at $LOCAL_EXP" >&2
    exit 1
  fi
  if [[ ! -d "$LOCAL_MLN" ]]; then
    echo "error: local mln-rs not found at $LOCAL_MLN" >&2
    exit 1
  fi

  rm -rf "$ROOT/engines/maplibre-rs-experimental" "$ROOT/engines/mln-rs"
  ln -s "$(cd "$LOCAL_EXP" && pwd)" "$ROOT/engines/maplibre-rs-experimental"
  ln -s "$(cd "$LOCAL_MLN" && pwd)" "$ROOT/engines/mln-rs"
  echo "Linked local engines into $ROOT/engines/"
elif [[ "$MODE" == "remote" ]]; then
  EXP_URL="https://github.com/luofang34/maplibre-rs-experimental.git"
  MLN_URL="https://github.com/louwers/mln-rs.git"

  sync_repo() {
    local dir="$1"
    local url="$2"
    local ref="$3"
    if [[ -L "$dir" ]]; then
      rm -f "$dir"
    fi
    if [[ ! -d "$dir/.git" ]]; then
      rm -rf "$dir"
      git clone --depth 1 "$url" "$dir"
    fi
    git -C "$dir" fetch --depth 1 origin "$ref"
    git -C "$dir" checkout --detach FETCH_HEAD
  }

  sync_repo "$ROOT/engines/maplibre-rs-experimental" "$EXP_URL" "$EXP_REF"
  sync_repo "$ROOT/engines/mln-rs" "$MLN_URL" "$MLN_REF"
else
  echo "usage: $0 [local | remote <exp_ref> <mln_ref>]" >&2
  exit 1
fi

EXP_SHA="$(git -C "$ROOT/engines/maplibre-rs-experimental" rev-parse HEAD)"
MLN_SHA="$(git -C "$ROOT/engines/mln-rs" rev-parse HEAD)"
NOW="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

cat > "$ROOT/engines.lock.json" <<EOF
{
  "updatedAt": "$NOW",
  "engines": {
    "maplibre-rs-experimental": {
      "repo": "https://github.com/luofang34/maplibre-rs-experimental.git",
      "branch": "$EXP_REF",
      "rev": "$EXP_SHA"
    },
    "mln-rs": {
      "repo": "https://github.com/louwers/mln-rs.git",
      "branch": "$MLN_REF",
      "rev": "$MLN_SHA"
    },
    "maplibre-gl-js": {
      "npm": "maplibre-gl",
      "version": "^5.1.0"
    }
  }
}
EOF

echo "Updated engines.lock.json:"
echo "  maplibre-rs-experimental: $EXP_SHA"
echo "  mln-rs:                   $MLN_SHA"
