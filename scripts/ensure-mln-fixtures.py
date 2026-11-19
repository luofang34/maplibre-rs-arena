#!/usr/bin/env python3
"""Ensure mln-rs benchmark fixtures are installed without macOS LibreSSL curl --parallel resets."""

import concurrent.futures
import hashlib
import json
import os
import shutil
import subprocess
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path


def cache_root() -> Path:
    env = os.environ.get("MLN_BENCH_FIXTURES", "").strip()
    if env:
        return Path(env)
    home = Path.home()
    if sys.platform == "darwin":
        return home / "Library" / "Caches" / "mln-rs" / "bench-fixtures"
    xdg = os.environ.get("XDG_CACHE_HOME", "").strip()
    base = Path(xdg) if xdg else (home / ".cache")
    return base / "mln-rs" / "bench-fixtures"


def file_matches(path: Path, expected_size: int, expected_sha256: str) -> bool:
    if not path.is_file():
        return False
    try:
        if path.stat().st_size != expected_size:
            return False
        h = hashlib.sha256()
        with path.open("rb") as f:
            while True:
                chunk = f.read(65536)
                if not chunk:
                    break
                h.update(chunk)
        return h.hexdigest() == expected_sha256
    except OSError:
        return False


def encode_url(base_url: str, rel_path: str) -> str:
    encoded = "/".join(urllib.parse.quote(seg, safe="") for seg in rel_path.split("/"))
    return f"{base_url}{encoded}"


def fetch_one(base_url: str, entry: dict, stage_dir: Path, seed_dirs: list[Path]) -> str:
    rel = entry["path"]
    size = int(entry["size"])
    sha = entry["sha256"]
    dest = stage_dir / rel
    dest.parent.mkdir(parents=True, exist_ok=True)

    if file_matches(dest, size, sha):
        return "cached"

    for seed in seed_dirs:
        candidate = seed / rel
        if file_matches(candidate, size, sha):
            shutil.copy2(candidate, dest)
            return "seeded"

    url = encode_url(base_url, rel)
    last_err = None
    for attempt in range(1, 6):
        tmp = dest.with_suffix(dest.suffix + f".part.{os.getpid()}")
        try:
            req = urllib.request.Request(
                url,
                headers={"User-Agent": "mln-rs-bench-fixtures-arena/1.0", "Connection": "close"},
            )
            with urllib.request.urlopen(req, timeout=45) as resp, tmp.open("wb") as out:
                shutil.copyfileobj(resp, out, length=65536)
            if file_matches(tmp, size, sha):
                tmp.replace(dest)
                return "downloaded"
            last_err = RuntimeError(f"hash/size mismatch for {rel}")
        except Exception as exc:  # noqa: BLE001
            last_err = exc
        finally:
            try:
                tmp.unlink(missing_ok=True)
            except OSError:
                pass
        time.sleep(min(0.5 * attempt, 3.0))
    raise RuntimeError(f"failed to download {rel} after retries: {last_err}")


def main() -> int:
    if len(sys.argv) < 3:
        print("usage: ensure-mln-fixtures.py <mln-rs-dir> <mln-bench-bin>", file=sys.stderr)
        return 2

    mln_dir = Path(sys.argv[1]).resolve()
    mln_bench = Path(sys.argv[2]).resolve()
    manifest_path = mln_dir / "tools" / "bench" / "fixtures.json"
    raw = manifest_path.read_bytes()
    manifest_hash = hashlib.sha256(raw).hexdigest()
    manifest = json.loads(raw.decode("utf-8"))

    root = cache_root()
    target = root / manifest_hash
    if target.is_dir():
        return 0

    root.mkdir(parents=True, exist_ok=True)
    seed_dirs = [p for p in root.glob(f".{manifest_hash[:16]}-*") if p.is_dir()]
    stage_dir = Path("/tmp/mln-fixtures-stage") / manifest_hash
    stage_dir.mkdir(parents=True, exist_ok=True)

    files = manifest["files"]
    base_url = manifest["base_url"]
    counts = {"cached": 0, "seeded": 0, "downloaded": 0}
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        futs = [pool.submit(fetch_one, base_url, entry, stage_dir, seed_dirs) for entry in files]
        for fut in concurrent.futures.as_completed(futs):
            kind = fut.result()
            counts[kind] += 1

    print(
        f"ensure-mln-fixtures: staged {len(files)} files "
        f"(seeded={counts['seeded']}, downloaded={counts['downloaded']}, cached={counts['cached']})",
        file=sys.stderr,
    )
    subprocess.run(
        [str(mln_bench), "fixtures", "--from", str(stage_dir)],
        cwd=str(mln_dir),
        check=True,
    )
    shutil.rmtree(stage_dir, ignore_errors=True)
    for p in seed_dirs:
        shutil.rmtree(p, ignore_errors=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
