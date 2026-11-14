use std::path::Path;
use std::process::Command;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Commits {
    pub maplibre_rs_experimental: String,
    pub mln_rs: String,
    pub maplibre_gl_js: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CapabilityRow {
    pub dimension: String,
    pub domain: String,
    pub exp_status: String,
    pub exp_detail: String,
    pub mln_status: String,
    pub mln_detail: String,
    pub gljs_reference: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NativeAbbaRow {
    pub scenario: String,
    pub workload: String,
    pub exp_median_ms: f64,
    pub mln_median_ms: f64,
    pub delta_pct: f64,
    pub mann_whitney_p: f64,
    pub verdict: String,
    pub exp_minstr: Option<f64>,
    pub mln_minstr: Option<f64>,
    pub exp_peak_rss_mib: Option<f64>,
    pub mln_peak_rss_mib: Option<f64>,
    pub notes: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConformanceSummary {
    pub render_tests_exp_pass_pct: f64,
    pub render_tests_mln_pass_pct: f64,
    pub expression_tests_mln_pass_pct: f64,
    pub terrain3d_conformance: String,
    pub xr_stereo_conformance: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MatrixReport {
    pub generated_at: String,
    pub commits: Commits,
    pub hardware_profile: String,
    pub capabilities: Vec<CapabilityRow>,
    pub native_abba: Vec<NativeAbbaRow>,
    pub conformance_summary: ConformanceSummary,
    pub solo_web_runs: Vec<serde_json::Value>,
}

pub fn git_short_rev(repo_dir: &Path) -> Option<String> {
    let out = Command::new("git")
        .arg("-C")
        .arg(repo_dir)
        .args(["rev-parse", "--short=10", "HEAD"])
        .output()
        .ok()?;
    if !out.status.success() {
        return None;
    }
    Some(String::from_utf8_lossy(&out.stdout).trim().to_string())
}

pub fn inspect_capabilities(exp_dir: &Path, mln_dir: &Path) -> Vec<CapabilityRow> {
    let exp_has_terrain = exp_dir.join("maplibre/src/terrain.rs").exists();
    let mln_style_json = std::fs::read_to_string(mln_dir.join("crates/mln_style/src/style_json.rs"))
        .unwrap_or_default();
    let mln_lacks_terrain = mln_style_json.is_empty()
        || mln_style_json.contains("doesn't draw terrain");

    let exp_has_xr = exp_dir.join("maplibre/src/headless/map/xr.rs").exists();
    let mln_has_xr = mln_dir.join("crates/mln_xr").exists();

    let exp_gaps = std::fs::read_to_string(exp_dir.join("GAPS.md")).unwrap_or_default();
    let exp_lacks_set_style = exp_gaps.is_empty() || exp_gaps.contains("setStyle");

    let mln_has_shaper = mln_dir.join("examples/web/shaper").exists()
        || mln_dir.join("crates/mln_text").exists();

    vec![
        CapabilityRow {
            dimension: "WebGPU Render Pipeline & Concurrency Model".into(),
            domain: "Web".into(),
            exp_status: "Full".into(),
            exp_detail: "wgpu WebGPU (supports single-threaded worker pool and SharedArrayBuffer multithreaded pool under COEP: credentialless)".into(),
            mln_status: "Full".into(),
            mln_detail: "OffscreenCanvas + dedicated Map Worker + MessageChannel Tile Workers, zero COOP/COEP requirement, built-in WebGL2 fallback".into(),
            gljs_reference: "WebGL2 + Web Worker pool".into(),
        },
        CapabilityRow {
            dimension: "Runtime Full Style Hot-Swap (setStyle)".into(),
            domain: "Web".into(),
            exp_status: if exp_lacks_set_style { "Gap" } else { "Full" }.into(),
            exp_detail: if exp_lacks_set_style {
                "Supports incremental addLayer / setPaintProperty / setGeoJsonData; full setStyle hot-swap not yet implemented".into()
            } else {
                "Full runtime style hot-swap supported".into()
            },
            mln_status: "Full".into(),
            mln_detail: "Native WebMap::set_style_url with preloaded resource reuse".into(),
            gljs_reference: "Full map.setStyle() support".into(),
        },
        CapabilityRow {
            dimension: "3D DEM Elevation Terrain Mesh & Vector Draping (style.terrain)".into(),
            domain: "3D & Terrain".into(),
            exp_status: if exp_has_terrain { "Full" } else { "Gap" }.into(),
            exp_detail: "Full raster-dem (terrarium/mapbox), 3D elevation mesh displacement, DrapeCache vector draping & subterranean camera clamping".into(),
            mln_status: if mln_lacks_terrain { "Gap" } else { "Full" }.into(),
            mln_detail: if mln_lacks_terrain {
                "2D hillshade & color-relief only; mln_style explicitly reports \"the map doesn't draw terrain\"".into()
            } else {
                "Upstream 3D terrain implementation detected".into()
            },
            gljs_reference: "Full 3D DEM mesh & vector draping".into(),
        },
        CapabilityRow {
            dimension: "3D Building Extrusions (fill-extrusion) & Globe Projection".into(),
            domain: "3D & Terrain".into(),
            exp_status: "Full".into(),
            exp_detail: "Supports fill-extrusion, globe & vertical-perspective projections with 6DoF roll/pitch camera".into(),
            mln_status: "Full".into(),
            mln_detail: "Supports fill-extrusion, projection: globe & set_globe_free_bearing trans-polar navigation".into(),
            gljs_reference: "Full fill-extrusion & Globe support".into(),
        },
        CapabilityRow {
            dimension: "Native XR Stereo Rendering (visionOS / HMD Stereo) & WebXR".into(),
            domain: "XR & WebXR".into(),
            exp_status: if exp_has_xr { "Full" } else { "Gap" }.into(),
            exp_detail: "HeadlessMap::run_xr_frame supports asymmetric per-eye frusta + CoveringPolicy::StereoReuse dual-eye tile sharing + apple/visionos target".into(),
            mln_status: if mln_has_xr { "Full" } else { "Gap" }.into(),
            mln_detail: if mln_has_xr {
                "Upstream XR module detected".into()
            } else {
                "No native multi-view stereo XR pipeline or visionOS / WebXR target".into()
            },
            gljs_reference: "No official dual-eye stereo tile-sharing pipeline".into(),
        },
        CapabilityRow {
            dimension: "Desktop & Mobile Native Host + Offline SQLite Cache".into(),
            domain: "Desktop & Mobile".into(),
            exp_status: "Partial".into(),
            exp_detail: "Supports macOS/Linux/Windows/Android/iOS/visionOS winit hosts; lacks built-in SQLite offline pack manager".into(),
            mln_status: "Full".into(),
            mln_detail: "Direct MapLibre Native C++ lineage with rusqlite offline storage, HTTP conditional cache & C ABI/FFI".into(),
            gljs_reference: "Web platform only".into(),
        },
        CapabilityRow {
            dimension: "Complex Script Shaping (RTL / Indic / HarfRust) & Local CJK Glyphs".into(),
            domain: "Style & Text".into(),
            exp_status: "Partial".into(),
            exp_detail: "Remote PBF SDF glyphs & collision placement; lacks HarfRust ligature shaping and local CJK Canvas SDF generation".into(),
            mln_status: if mln_has_shaper { "Full" } else { "Partial" }.into(),
            mln_detail: "On-demand mln_web_shaper (HarfRust + skrifa + FreeType) plus zero-download localIdeographFontFamily CJK rendering".into(),
            gljs_reference: "tiny-sdf + mapbox-gl-rtl-text plugin".into(),
        },
    ]
}

pub fn render_markdown_summary(report: &MatrixReport) -> String {
    let mut out = String::new();
    out.push_str("# MapLibre Rust Arena — Latest Matrix Report\n\n");
    out.push_str(&format!("- **Generated At**: `{}`\n", report.generated_at));
    out.push_str(&format!(
        "- **`maplibre-rs-experimental` rev**: `{}`\n",
        report.commits.maplibre_rs_experimental
    ));
    out.push_str(&format!(
        "- **`mln-rs` rev**: `{}`\n",
        report.commits.mln_rs
    ));
    out.push_str(&format!(
        "- **Hardware Profile**: {}\n\n",
        report.hardware_profile
    ));

    out.push_str("## 1. Platform, 3D Terrain & XR Capability Matrix\n\n");
    out.push_str("| Dimension | Domain | `maplibre-rs-experimental` | `mln-rs` |\n");
    out.push_str("| :--- | :--- | :--- | :--- |\n");
    for row in &report.capabilities {
        out.push_str(&format!(
            "| {} | {} | **{}** — {} | **{}** — {} |\n",
            row.dimension, row.domain, row.exp_status, row.exp_detail, row.mln_status, row.mln_detail
        ));
    }

    out.push_str("\n## 2. Native Headless ABBA Benchmarks\n\n");
    out.push_str("| Scenario | Workload | `exp-rs` Median (ms) | `mln-rs` Median (ms) | Mann-Whitney p | Verdict | Notes |\n");
    out.push_str("| :--- | :--- | ---: | ---: | ---: | :--- | :--- |\n");
    for abba in &report.native_abba {
        let exp_s = if abba.exp_median_ms > 0.0 {
            format!("{:.2}", abba.exp_median_ms)
        } else {
            "—".into()
        };
        let mln_s = if abba.mln_median_ms > 0.0 {
            format!("{:.2}", abba.mln_median_ms)
        } else {
            "Unsupported".into()
        };
        let p_s = if abba.mln_median_ms > 0.0 {
            format!("{:.3}", abba.mann_whitney_p)
        } else {
            "—".into()
        };
        out.push_str(&format!(
            "| {} | {} | {} | {} | {} | **{}** | {} |\n",
            abba.scenario, abba.workload, exp_s, mln_s, p_s, abba.verdict, abba.notes
        ));
    }

    out
}
