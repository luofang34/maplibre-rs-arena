use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::process::Command;

use serde::{Deserialize, Serialize};

use crate::diff;

#[derive(Debug, Clone, Copy)]
pub struct ObservedDraws {
    pub still_draws: f64,
    pub pan_draws: f64,
}

#[derive(Debug, Clone)]
pub struct NativeParityConfig {
    pub scenarios: Vec<String>,
    pub draw_tol_pct: f64,
    pub cross_ssim_min: f64,
    pub cross_diff_max: f64,
    pub golden_ssim_min: f64,
    pub golden_diff_max: f64,
    pub update_refs: bool,
    pub skip_build: bool,
}

impl Default for NativeParityConfig {
    fn default() -> Self {
        Self {
            scenarios: vec!["s1".into(), "s3".into(), "s4".into(), "s5".into()],
            draw_tol_pct: 5.0,
            cross_ssim_min: 0.65,
            cross_diff_max: 45.0,
            golden_ssim_min: 0.95,
            golden_diff_max: 5.0,
            update_refs: false,
            skip_build: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NativeParityCheck {
    pub scenario: String,
    pub still_draws: f64,
    pub pan_draws: f64,
    pub draw_delta_pct: Option<f64>,
    pub non_blank: bool,
    pub cross_engine: Option<String>,
    pub cross_ssim: Option<f64>,
    pub cross_active_ssim: Option<f64>,
    pub cross_diff_pct: Option<f64>,
    pub golden_ssim: Option<f64>,
    pub golden_diff_pct: Option<f64>,
    pub ok: bool,
    pub failure_reason: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NativeParityReport {
    pub passed: bool,
    pub draw_tol_pct: f64,
    pub checks: Vec<NativeParityCheck>,
    pub failures: Vec<String>,
}

pub fn draw_delta_pct(actual: f64, reference: f64) -> Option<f64> {
    if !actual.is_finite() || !reference.is_finite() || reference <= 0.0 {
        return None;
    }
    Some(((actual - reference) / reference) * 100.0)
}

pub fn ensure_exp_demo_bin(exp_dir: &Path, skip_build: bool) -> Result<PathBuf, String> {
    let bin = exp_dir.join("target/release/maplibre-demo");
    if skip_build && bin.is_file() {
        return Ok(bin);
    }
    let status = Command::new("cargo")
        .current_dir(exp_dir)
        .args(["build", "--release", "-p", "maplibre-demo", "--features", "headless"])
        .status()
        .map_err(|e| format!("cargo build maplibre-demo failed: {e}"))?;
    if !status.success() {
        return Err("failed to build maplibre-demo --features headless".into());
    }
    Ok(bin)
}

pub fn ensure_mln_bench_bin(
    mln_dir: &Path,
    repo_root: &Path,
    skip_build: bool,
) -> Result<(PathBuf, bool), String> {
    let mln_target_dir = std::env::temp_dir().join("mln-bench-target");
    let modern_bench = mln_dir.join("tools/bench/profile.toml").is_file();
    if modern_bench {
        let bin = mln_target_dir.join("benchmark/mln-bench");
        if !skip_build || !bin.is_file() {
            let status = Command::new("cargo")
                .current_dir(mln_dir)
                .env("CARGO_TARGET_DIR", &mln_target_dir)
                .env_remove("RUSTFLAGS")
                .args([
                    "build",
                    "--config",
                    "tools/bench/profile.toml",
                    "--profile",
                    "benchmark",
                    "-p",
                    "mln-rs-bench",
                ])
                .status()
                .map_err(|e| format!("cargo build mln-rs-bench failed: {e}"))?;
            if !status.success() {
                return Err("failed to build mln-rs-bench (benchmark profile)".into());
            }
        }
        let ensure_script = repo_root.join("scripts/ensure-mln-fixtures.py");
        let status_fix = if ensure_script.is_file() {
            Command::new("python3")
                .arg(&ensure_script)
                .arg(mln_dir)
                .arg(&bin)
                .status()
                .map_err(|e| format!("ensure-mln-fixtures.py failed: {e}"))?
        } else {
            Command::new(&bin)
                .current_dir(mln_dir)
                .arg("fixtures")
                .status()
                .map_err(|e| format!("mln-bench fixtures failed: {e}"))?
        };
        if !status_fix.success() {
            return Err("failed to install mln-bench fixtures".into());
        }
        Ok((bin, true))
    } else {
        let bin = mln_target_dir.join("release/mln-bench");
        if !skip_build || !bin.is_file() {
            let status = Command::new("cargo")
                .current_dir(mln_dir)
                .env("CARGO_TARGET_DIR", &mln_target_dir)
                .args(["build", "--release", "-p", "mln-rs-bench"])
                .status()
                .map_err(|e| format!("cargo build mln-rs-bench failed: {e}"))?;
            if !status.success() {
                return Err("failed to build mln-rs-bench".into());
            }
        }
        Ok((bin, false))
    }
}

struct ScenarioPose {
    arg: &'static str,
    lat: f64,
    lon: f64,
    zoom: f64,
    pitch: f64,
    bearing: f64,
    globe: bool,
    terrain: bool,
    mln_load_scenario: Option<&'static str>,
}

fn pose_for_scenario(sc: &str) -> Result<ScenarioPose, String> {
    match sc.to_lowercase().as_str() {
        "s1" => Ok(ScenarioPose {
            arg: "s1",
            lat: 37.76,
            lon: -122.435,
            zoom: 14.0,
            pitch: 0.0,
            bearing: 0.0,
            globe: false,
            terrain: false,
            mln_load_scenario: Some("macro/load/street"),
        }),
        "s3" => Ok(ScenarioPose {
            arg: "s3",
            lat: 35.6825,
            lon: 139.765,
            zoom: 14.0,
            pitch: 0.0,
            bearing: 0.0,
            globe: false,
            terrain: false,
            mln_load_scenario: Some("macro/load/cjk"),
        }),
        "s4" => Ok(ScenarioPose {
            arg: "s4",
            lat: 30.0,
            lon: 10.0,
            zoom: 1.5,
            pitch: 0.0,
            bearing: 0.0,
            globe: true,
            terrain: false,
            mln_load_scenario: Some("macro/load/globe"),
        }),
        "s5" => Ok(ScenarioPose {
            arg: "s5",
            lat: 47.27,
            lon: 11.40,
            zoom: 12.2,
            pitch: 62.0,
            bearing: 35.0,
            globe: false,
            terrain: true,
            mln_load_scenario: None,
        }),
        other => Err(format!("unknown native parity scenario '{other}'")),
    }
}

fn probe_exp_draws(exp_bin: &Path, exp_dir: &Path, sc: &str) -> Result<ObservedDraws, String> {
    let out = Command::new(exp_bin)
        .current_dir(exp_dir)
        .args(["bench", "--scenario", sc, "--width", "1024", "--height", "768", "--frames", "2", "--json"])
        .output()
        .map_err(|e| format!("maplibre-demo bench {sc} failed: {e}"))?;
    if !out.status.success() {
        return Err(format!("maplibre-demo bench {sc} exited {}", out.status));
    }
    let parsed: serde_json::Value =
        serde_json::from_slice(&out.stdout).map_err(|e| format!("parse bench {sc} JSON: {e}"))?;
    let still = parsed
        .get(0)
        .and_then(|r| r.get("still"))
        .and_then(|p| p.get("avg_draws"))
        .and_then(serde_json::Value::as_f64)
        .unwrap_or(0.0);
    let pan = parsed
        .get(0)
        .and_then(|r| r.get("pan_throughput"))
        .and_then(|p| p.get("avg_draws"))
        .and_then(serde_json::Value::as_f64)
        .unwrap_or(0.0);
    Ok(ObservedDraws {
        still_draws: still,
        pan_draws: pan,
    })
}

fn render_exp_snapshot(exp_bin: &Path, exp_dir: &Path, pose: &ScenarioPose, out_png: &Path) -> Result<(), String> {
    let mut cmd = Command::new(exp_bin);
    cmd.current_dir(exp_dir).arg("snapshot");
    if pose.terrain {
        cmd.arg("--terrain");
    } else {
        cmd.args(["--style", "https://tiles.openfreemap.org/styles/liberty"]);
        if pose.globe {
            cmd.args(["--projection", "globe"]);
        }
    }
    cmd.args([
        "--width",
        "1024",
        "--height",
        "768",
        "--lat",
        &pose.lat.to_string(),
        "--lon",
        &pose.lon.to_string(),
        "--zoom",
        &pose.zoom.to_string(),
        "--pitch",
        &pose.pitch.to_string(),
        "--bearing",
        &pose.bearing.to_string(),
        "--max-frames",
        "360",
        "--timeout-secs",
        "30",
        "--out",
    ])
    .arg(out_png);
    let out = cmd.output().map_err(|e| format!("snapshot {} failed: {e}", pose.arg))?;
    if !out.status.success() {
        let stderr = String::from_utf8_lossy(&out.stderr);
        return Err(format!("maplibre-demo snapshot {} failed: {}", pose.arg, stderr.trim()));
    }
    Ok(())
}

fn render_mln_snapshot(mln_bin: &Path, mln_dir: &Path, scenario: &str, out_png: &Path) -> Result<(), String> {
    let out_json = out_png.with_extension("json");
    let mut cmd = Command::new(mln_bin);
    cmd.current_dir(mln_dir)
        .args(["exec", scenario])
        .arg(&out_json)
        .arg("--image")
        .arg(out_png);
    if cfg!(target_os = "macos") {
        cmd.env("MLN_RENDER_BACKEND", "metal");
    }
    let out = cmd.output().map_err(|e| format!("mln-bench exec {scenario} failed: {e}"))?;
    if !out.status.success() {
        let stderr = String::from_utf8_lossy(&out.stderr);
        return Err(format!("mln-bench exec {scenario} failed: {}", stderr.trim()));
    }
    Ok(())
}

pub fn run_native_parity_gate(
    exp_dir: &Path,
    mln_dir: &Path,
    repo_root: &Path,
    cfg: &NativeParityConfig,
    observed: &HashMap<String, ObservedDraws>,
) -> Result<NativeParityReport, String> {
    let exp_bin = ensure_exp_demo_bin(exp_dir, cfg.skip_build)?;
    let (mln_bin, modern_bench) = ensure_mln_bench_bin(mln_dir, repo_root, cfg.skip_build)?;

    let out_dir = repo_root.join("reports/parity-last/native");
    std::fs::create_dir_all(&out_dir).map_err(|e| format!("mkdir {}: {e}", out_dir.display()))?;
    let refs_dir = repo_root.join("reports/parity-refs/native");
    let ref_json_path = refs_dir.join("native-reference.json");
    let golden_draws: HashMap<String, f64> = std::fs::read_to_string(&ref_json_path)
        .ok()
        .and_then(|raw| serde_json::from_str(&raw).ok())
        .unwrap_or_default();

    let mut checks = Vec::new();
    let mut failures = Vec::new();
    let mut new_golden_draws = HashMap::new();

    for sc in &cfg.scenarios {
        let pose = pose_for_scenario(sc)?;
        let draws = match observed.get(pose.arg) {
            Some(&d) => d,
            None => probe_exp_draws(&exp_bin, exp_dir, pose.arg)?,
        };
        let exp_png = out_dir.join(format!("{}-exp.png", pose.arg));
        render_exp_snapshot(&exp_bin, exp_dir, &pose, &exp_png)?;
        let stats = diff::analyze_png_file(&exp_png)?;

        let mut reasons = Vec::new();
        if draws.still_draws <= 0.0 {
            reasons.push(format!("still_draws={} (must be > 0)", draws.still_draws));
        } else if draws.pan_draws < draws.still_draws * 0.25 {
            reasons.push(format!(
                "pan_draws={} collapsed below 25% of still_draws={}",
                draws.pan_draws, draws.still_draws
            ));
        }
        if !stats.non_blank {
            reasons.push(format!(
                "blank exp PNG (luma_std={:.2}, colors={})",
                stats.luma_std, stats.quantized_colors
            ));
        }

        let draw_delta = golden_draws
            .get(pose.arg)
            .and_then(|&g| draw_delta_pct(draws.still_draws, g));
        if let Some(delta) = draw_delta {
            if delta.abs() > cfg.draw_tol_pct {
                reasons.push(format!(
                    "still_draws={:.1} vs golden={:.1} (delta={delta:+.2}% > ±{:.1}%)",
                    draws.still_draws,
                    golden_draws[pose.arg],
                    cfg.draw_tol_pct
                ));
            }
        }

        let mut cross_ssim = None;
        let mut cross_active_ssim = None;
        let mut cross_diff = None;
        if modern_bench {
            if let Some(mln_sc) = pose.mln_load_scenario {
                let mln_png = out_dir.join(format!("{}-mln.png", pose.arg));
                render_mln_snapshot(&mln_bin, mln_dir, mln_sc, &mln_png)?;
                let cmp = diff::compare_png_files(&mln_png, &exp_png, 0.12)?;
                cross_ssim = Some((cmp.ssim * 10_000.0).round() / 10_000.0);
                cross_active_ssim = Some((cmp.active_ssim * 10_000.0).round() / 10_000.0);
                cross_diff = Some((cmp.diff_pct * 1000.0).round() / 1000.0);
                let ssim_ok = cmp.ssim >= cfg.cross_ssim_min
                    || (cmp.active_ssim >= cfg.cross_ssim_min && cmp.diff_pct <= 15.0);
                if !cmp.non_blank {
                    reasons.push("mln/exp pair contains a blank frame".into());
                } else if !ssim_ok || cmp.diff_pct > cfg.cross_diff_max {
                    reasons.push(format!(
                        "vs {mln_sc}: ssim={:.4}, activeSsim={:.4} (<{:.2}) or diff={:.2}% (>{:.1}%)",
                        cmp.ssim, cmp.active_ssim, cfg.cross_ssim_min, cmp.diff_pct, cfg.cross_diff_max
                    ));
                }
            }
        }

        let mut golden_ssim = None;
        let mut golden_diff = None;
        let golden_png = refs_dir.join(format!("{}.png", pose.arg));
        if golden_png.is_file() {
            let cmp = diff::compare_png_files(&golden_png, &exp_png, 0.12)?;
            golden_ssim = Some((cmp.ssim * 10_000.0).round() / 10_000.0);
            golden_diff = Some((cmp.diff_pct * 1000.0).round() / 1000.0);
            if cmp.ssim < cfg.golden_ssim_min || cmp.diff_pct > cfg.golden_diff_max {
                reasons.push(format!(
                    "vs golden png: ssim={:.4} (<{:.2}) or diff={:.2}% (>{:.1}%)",
                    cmp.ssim, cfg.golden_ssim_min, cmp.diff_pct, cfg.golden_diff_max
                ));
            }
        }

        let ok = reasons.is_empty();
        let failure_reason = if ok { None } else { Some(reasons.join("; ")) };
        if let Some(ref msg) = failure_reason {
            failures.push(format!("{}: {msg}", pose.arg));
        }
        new_golden_draws.insert(pose.arg.to_string(), draws.still_draws);
        checks.push(NativeParityCheck {
            scenario: pose.arg.into(),
            still_draws: draws.still_draws,
            pan_draws: draws.pan_draws,
            draw_delta_pct: draw_delta,
            non_blank: stats.non_blank,
            cross_engine: pose.mln_load_scenario.map(str::to_owned),
            cross_ssim,
            cross_active_ssim,
            cross_diff_pct: cross_diff,
            golden_ssim,
            golden_diff_pct: golden_diff,
            ok,
            failure_reason,
        });
    }

    let report = NativeParityReport {
        passed: failures.is_empty(),
        draw_tol_pct: cfg.draw_tol_pct,
        checks,
        failures: failures.clone(),
    };
    let report_path = repo_root.join("reports/latest-native-parity.json");
    if let Some(parent) = report_path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    let json = serde_json::to_string_pretty(&report).map_err(|e| format!("serialize parity: {e}"))?;
    std::fs::write(&report_path, json).map_err(|e| format!("write {}: {e}", report_path.display()))?;

    if !report.passed {
        return Err(format!(
            "native parity gate failed:\n  - {}",
            report.failures.join("\n  - ")
        ));
    }

    if cfg.update_refs {
        std::fs::create_dir_all(&refs_dir).map_err(|e| format!("mkdir {}: {e}", refs_dir.display()))?;
        for c in &report.checks {
            let src = out_dir.join(format!("{}-exp.png", c.scenario));
            let dst = refs_dir.join(format!("{}.png", c.scenario));
            let _ = std::fs::copy(src, dst);
        }
        let draws_json = serde_json::to_string_pretty(&new_golden_draws)
            .map_err(|e| format!("serialize golden draws: {e}"))?;
        std::fs::write(&ref_json_path, draws_json)
            .map_err(|e| format!("write {}: {e}", ref_json_path.display()))?;
    }

    Ok(report)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn draw_delta_respects_five_percent_bound() {
        let ok = draw_delta_pct(209.0, 200.0).unwrap();
        assert!((ok - 4.5).abs() < 1e-6);
        assert!(ok.abs() <= 5.0);

        let bad = draw_delta_pct(211.0, 200.0).unwrap();
        assert!((bad - 5.5).abs() < 1e-6);
        assert!(bad.abs() > 5.0);

        assert!(draw_delta_pct(100.0, 0.0).is_none());
    }
}
