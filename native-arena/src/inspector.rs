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
            dimension: "WebGPU 渲染管线与并发模型".into(),
            domain: "Web".into(),
            exp_status: "Full".into(),
            exp_detail: "wgpu WebGPU (支持单线程 Worker 池与 COEP: credentialless 下的 SharedArrayBuffer 多线程池)".into(),
            mln_status: "Full".into(),
            mln_detail: "OffscreenCanvas + 独立 Map Worker + MessageChannel Tile Workers，零 COOP/COEP 依赖，内置 WebGL2 回退".into(),
            gljs_reference: "WebGL2 + Web Worker 池".into(),
        },
        CapabilityRow {
            dimension: "运行时整套样式热切换 (setStyle)".into(),
            domain: "Web".into(),
            exp_status: if exp_lacks_set_style { "Gap" } else { "Full" }.into(),
            exp_detail: if exp_lacks_set_style {
                "支持增量 addLayer / setPaintProperty / setGeoJsonData；尚不支持完整 setStyle 热替换".into()
            } else {
                "已支持运行时完整样式切换".into()
            },
            mln_status: "Full".into(),
            mln_detail: "原生支持 WebMap::set_style_url 与预加载资源复用".into(),
            gljs_reference: "map.setStyle() 完整支持".into(),
        },
        CapabilityRow {
            dimension: "3D DEM 高程地形网格与矢量贴地 (style.terrain)".into(),
            domain: "3D & Terrain".into(),
            exp_status: if exp_has_terrain { "Full" } else { "Gap" }.into(),
            exp_detail: "完整支持 raster-dem (terrarium/mapbox)、3D 地形网格起伏、DrapeCache 道路/面贴地重绘及海拔防穿模".into(),
            mln_status: if mln_lacks_terrain { "Gap" } else { "Full" }.into(),
            mln_detail: if mln_lacks_terrain {
                "仅支持 2D hillshade 与 color-relief；mln_style 明确返回 the map doesn't draw terrain".into()
            } else {
                "检测到上游新增 3D terrain 支持".into()
            },
            gljs_reference: "支持 3D DEM 网格与 Draping".into(),
        },
        CapabilityRow {
            dimension: "3D 建筑挤压 (fill-extrusion) 与 Globe 球面投影".into(),
            domain: "3D & Terrain".into(),
            exp_status: "Full".into(),
            exp_detail: "支持 fill-extrusion、globe 与 vertical-perspective 投影及 6DoF roll/pitch 相机".into(),
            mln_status: "Full".into(),
            mln_detail: "支持 fill-extrusion、projection: globe 及 set_globe_free_bearing 跨极点自由航向".into(),
            gljs_reference: "支持 fill-extrusion 与 Globe".into(),
        },
        CapabilityRow {
            dimension: "Native XR 双目立体渲染 (visionOS / HMD Stereo) 与 WebXR".into(),
            domain: "XR & WebXR".into(),
            exp_status: if exp_has_xr { "Full" } else { "Gap" }.into(),
            exp_detail: "HeadlessMap::run_xr_frame 原生支持左右眼非对称视锥体 + CoveringPolicy::StereoReuse 双目瓦片共享 + apple/visionos 工程".into(),
            mln_status: if mln_has_xr { "Full" } else { "Gap" }.into(),
            mln_detail: if mln_has_xr {
                "检测到 XR 模块".into()
            } else {
                "无原生 XR 多视图立体管线或 visionOS / WebXR 目标".into()
            },
            gljs_reference: "无官方双目 Stereo 瓦片共享管线".into(),
        },
        CapabilityRow {
            dimension: "桌面与移动端原生宿主 + 离线存储".into(),
            domain: "Desktop & Mobile".into(),
            exp_status: "Partial".into(),
            exp_detail: "支持 macOS/Linux/Windows/Android/iOS/visionOS winit 宿主，缺少原生 SQLite 离线包管理".into(),
            mln_status: "Full".into(),
            mln_detail: "源自 MapLibre Native C++ 完整架构，含 rusqlite 离线存储、HTTP 条件缓存与 C ABI/FFI".into(),
            gljs_reference: "仅 Web 平台".into(),
        },
        CapabilityRow {
            dimension: "复杂文本塑形 (RTL / Indic / HarfRust) 与本地 CJK 字形".into(),
            domain: "Style & Text".into(),
            exp_status: "Partial".into(),
            exp_detail: "支持远程 PBF SDF 字形与碰撞检测；暂缺 HarfRust 连字塑形与本地 CJK Canvas SDF 生成".into(),
            mln_status: if mln_has_shaper { "Full" } else { "Partial" }.into(),
            mln_detail: "按需加载 mln_web_shaper (HarfRust + skrifa + FreeType) 并支持 localIdeographFontFamily 免下载绘制 CJK".into(),
            gljs_reference: "tiny-sdf + mapbox-gl-rtl-text 插件".into(),
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
