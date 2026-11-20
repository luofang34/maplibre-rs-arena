use std::path::Path;

#[derive(Debug, Clone, Copy)]
pub struct DiffResult {
    pub width: u32,
    pub height: u32,
    pub mismatched_pixels: usize,
    pub diff_pct: f64,
    pub ssim: f64,
    pub active_ssim: f64,
    pub non_blank: bool,
}

#[derive(Debug, Clone, Copy)]
pub struct SingleImageStats {
    pub luma_std: f64,
    pub quantized_colors: usize,
    pub non_blank: bool,
}

fn luma_and_non_blank(img: &[u8], width: u32, height: u32) -> (Vec<f64>, f64, usize, bool) {
    let n = (width as usize) * (height as usize);
    let mut luma = Vec::with_capacity(n);
    let mut buckets = std::collections::HashSet::with_capacity(256);
    let mut sum = 0.0f64;
    for px in img[..n * 4].as_chunks::<4>().0 {
        let a = (px[3] as f64) / 255.0;
        let r = blend_white(px[0], a);
        let g = blend_white(px[1], a);
        let b = blend_white(px[2], a);
        let y = rgb2y(r, g, b);
        luma.push(y);
        sum += y;
        let key = (((r.round() as u32) >> 3) << 10)
            | (((g.round() as u32) >> 3) << 5)
            | ((b.round() as u32) >> 3);
        buckets.insert(key);
    }
    let mean = if n > 0 { sum / (n as f64) } else { 0.0 };
    let var = if n > 0 {
        luma.iter().map(|y| (y - mean) * (y - mean)).sum::<f64>() / (n as f64)
    } else {
        0.0
    };
    let std_dev = var.sqrt();
    let colors = buckets.len();
    (luma, std_dev, colors, std_dev >= 2.0 && colors >= 8)
}

fn compute_windowed_ssim(luma_a: &[f64], luma_b: &[f64], width: u32, height: u32) -> (f64, f64) {
    let w = width as usize;
    let h = height as usize;
    if w == 0 || h == 0 {
        return (0.0, 0.0);
    }
    let c1 = (0.01 * 255.0_f64).powi(2);
    let c2 = (0.03 * 255.0_f64).powi(2);
    let win_w = if w >= 8 { 8 } else { w };
    let win_h = if h >= 8 { 8 } else { h };
    let blocks_x = (w / win_w).max(1);
    let blocks_y = (h / win_h).max(1);
    let win_n = (win_w * win_h) as f64;

    let mut ssim_sum = 0.0f64;
    let mut active_ssim_sum = 0.0f64;
    let mut active_blocks = 0usize;
    for by in 0..blocks_y {
        for bx in 0..blocks_x {
            let mut sum_a = 0.0;
            let mut sum_b = 0.0;
            for dy in 0..win_h {
                let row = (by * win_h + dy) * w + bx * win_w;
                for dx in 0..win_w {
                    sum_a += luma_a[row + dx];
                    sum_b += luma_b[row + dx];
                }
            }
            let mu_a = sum_a / win_n;
            let mu_b = sum_b / win_n;
            let (mut var_a, mut var_b, mut cov) = (0.0, 0.0, 0.0);
            for dy in 0..win_h {
                let row = (by * win_h + dy) * w + bx * win_w;
                for dx in 0..win_w {
                    let da = luma_a[row + dx] - mu_a;
                    let db = luma_b[row + dx] - mu_b;
                    var_a += da * da;
                    var_b += db * db;
                    cov += da * db;
                }
            }
            var_a /= win_n;
            var_b /= win_n;
            cov /= win_n;
            let num = (2.0 * mu_a * mu_b + c1) * (2.0 * cov + c2);
            let den = (mu_a * mu_a + mu_b * mu_b + c1) * (var_a + var_b + c2);
            let block_ssim = if den > 0.0 { num / den } else { 1.0 };
            ssim_sum += block_ssim;
            if mu_a.max(mu_b) >= 16.0 || var_a.max(var_b) >= 4.0 {
                active_ssim_sum += block_ssim;
                active_blocks += 1;
            }
        }
    }
    let full = ssim_sum / ((blocks_x * blocks_y) as f64);
    let active = if active_blocks > 0 {
        active_ssim_sum / (active_blocks as f64)
    } else {
        full
    };
    (full, active)
}

/// Computes perceptual YIQ color delta (matching pixelmatch's NTSC YIQ metric) and 8x8 luminance SSIM.
pub fn perceptual_rgba_diff(
    img_a: &[u8],
    img_b: &[u8],
    width: u32,
    height: u32,
    threshold: f64,
) -> Result<DiffResult, String> {
    let expected_len = (width as usize) * (height as usize) * 4;
    if img_a.len() < expected_len || img_b.len() < expected_len {
        return Err(format!(
            "RGBA buffer shorter than {}x{}x4 ({} vs {})",
            width,
            height,
            img_a.len(),
            img_b.len()
        ));
    }

    let (luma_a, _std_a, _col_a, ok_a) = luma_and_non_blank(&img_a[..expected_len], width, height);
    let (luma_b, _std_b, _col_b, ok_b) = luma_and_non_blank(&img_b[..expected_len], width, height);
    let (ssim, active_ssim) = compute_windowed_ssim(&luma_a, &luma_b, width, height);

    let max_delta = 35215.0 * threshold * threshold;
    let mut mismatched = 0usize;

    for (px_a, px_b) in img_a[..expected_len]
        .as_chunks::<4>()
        .0
        .iter()
        .zip(img_b[..expected_len].as_chunks::<4>().0.iter())
    {
        if px_a == px_b {
            continue;
        }
        let a1 = (px_a[3] as f64) / 255.0;
        let a2 = (px_b[3] as f64) / 255.0;
        let r1 = blend_white(px_a[0], a1);
        let g1 = blend_white(px_a[1], a1);
        let b1 = blend_white(px_a[2], a1);
        let r2 = blend_white(px_b[0], a2);
        let g2 = blend_white(px_b[1], a2);
        let b2 = blend_white(px_b[2], a2);

        let y = rgb2y(r1, g1, b1) - rgb2y(r2, g2, b2);
        let i = rgb2i(r1, g1, b1) - rgb2i(r2, g2, b2);
        let q = rgb2q(r1, g1, b1) - rgb2q(r2, g2, b2);
        let delta = 0.5053 * y * y + 0.299 * i * i + 0.1957 * q * q;
        if delta > max_delta {
            mismatched += 1;
        }
    }

    let total_px = (width as usize) * (height as usize);
    let diff_pct = if total_px > 0 {
        (mismatched as f64 / total_px as f64) * 100.0
    } else {
        0.0
    };

    Ok(DiffResult {
        width,
        height,
        mismatched_pixels: mismatched,
        diff_pct,
        ssim,
        active_ssim,
        non_blank: ok_a && ok_b,
    })
}

pub fn analyze_png_file(path: &Path) -> Result<SingleImageStats, String> {
    let (w, h, rgba) = decode_rgba8_png(path)?;
    let (_, luma_std, quantized_colors, non_blank) = luma_and_non_blank(&rgba, w, h);
    Ok(SingleImageStats {
        luma_std,
        quantized_colors,
        non_blank,
    })
}

pub fn compare_png_files(path_a: &Path, path_b: &Path, threshold: f64) -> Result<DiffResult, String> {
    let (wa, ha, buf_a) = decode_rgba8_png(path_a)?;
    let (wb, hb, buf_b) = decode_rgba8_png(path_b)?;
    if wa != wb || ha != hb {
        return Err(format!(
            "PNG dimensions differ: {}x{} vs {}x{}",
            wa, ha, wb, hb
        ));
    }
    perceptual_rgba_diff(&buf_a, &buf_b, wa, ha, threshold)
}

fn decode_rgba8_png(path: &Path) -> Result<(u32, u32, Vec<u8>), String> {
    let file = std::fs::File::open(path).map_err(|e| format!("open {}: {e}", path.display()))?;
    let mut decoder = png::Decoder::new(file);
    decoder.set_transformations(png::Transformations::EXPAND | png::Transformations::STRIP_16);
    let mut reader = decoder
        .read_info()
        .map_err(|e| format!("png header {}: {e}", path.display()))?;
    let mut raw = vec![0u8; reader.output_buffer_size()];
    let info = reader
        .next_frame(&mut raw)
        .map_err(|e| format!("png decode {}: {e}", path.display()))?;
    raw.truncate(info.buffer_size());

    let rgba = match info.color_type {
        png::ColorType::Rgba => raw,
        png::ColorType::Rgb => {
            let mut out = Vec::with_capacity((info.width * info.height * 4) as usize);
            for rgb in raw.as_chunks::<3>().0 {
                out.extend_from_slice(&[rgb[0], rgb[1], rgb[2], 255]);
            }
            out
        }
        other => {
            return Err(format!(
                "unsupported PNG color type {other:?} in {}",
                path.display()
            ))
        }
    };
    Ok((info.width, info.height, rgba))
}

#[inline]
fn blend_white(channel: u8, alpha: f64) -> f64 {
    255.0 + ((channel as f64) - 255.0) * alpha
}

#[inline]
fn rgb2y(r: f64, g: f64, b: f64) -> f64 {
    r * 0.29889531 + g * 0.58662247 + b * 0.11448223
}

#[inline]
fn rgb2i(r: f64, g: f64, b: f64) -> f64 {
    r * 0.59597799 - g * 0.27417610 - b * 0.32180189
}

#[inline]
fn rgb2q(r: f64, g: f64, b: f64) -> f64 {
    r * 0.21147017 - g * 0.52261711 + b * 0.31114694
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn identical_buffers_have_zero_diff() {
        let mut px = Vec::with_capacity(8 * 8 * 4);
        for y in 0..8u8 {
            for x in 0..8u8 {
                px.extend_from_slice(&[x * 20, y * 25, (x ^ y) * 15, 255]);
            }
        }
        let res = perceptual_rgba_diff(&px, &px, 8, 8, 0.1).unwrap();
        assert_eq!(res.mismatched_pixels, 0);
        assert_eq!(res.diff_pct, 0.0);
        assert!((res.ssim - 1.0).abs() < 1e-6);
        assert!((res.active_ssim - 1.0).abs() < 1e-6);
        assert!(res.non_blank);
    }

    #[test]
    fn contrasting_pixel_is_counted() {
        let a = [10u8, 10, 10, 255, 10, 10, 10, 255];
        let b = [10u8, 10, 10, 255, 250, 40, 40, 255];
        let res = perceptual_rgba_diff(&a, &b, 2, 1, 0.1).unwrap();
        assert_eq!(res.mismatched_pixels, 1);
        assert!((res.diff_pct - 50.0).abs() < 1e-6);
        assert!(res.ssim < 0.8);
        assert!(!res.non_blank);
    }

    #[test]
    fn active_ssim_recovers_dark_space_foreground_match() {
        let w = 64u32;
        let h = 64u32;
        let mut a = Vec::with_capacity((w * h * 4) as usize);
        let mut b = Vec::with_capacity((w * h * 4) as usize);
        for y in 0..h {
            for x in 0..w {
                let in_fg = (16..48).contains(&x) && (16..48).contains(&y);
                if !in_fg {
                    a.extend_from_slice(&[9, 13, 22, 255]);
                    b.extend_from_slice(&[0, 0, 0, 255]);
                } else {
                    let px = [(40 + x * 3) as u8, (60 + y * 2) as u8, 180, 255];
                    a.extend_from_slice(&px);
                    b.extend_from_slice(&px);
                }
            }
        }
        let res = perceptual_rgba_diff(&a, &b, w, h, 0.12).unwrap();
        assert!(res.ssim < 0.65);
        assert!(res.active_ssim > 0.99);
    }
}
