use std::path::Path;

#[derive(Debug, Clone, Copy)]
pub struct DiffResult {
    pub width: u32,
    pub height: u32,
    pub mismatched_pixels: usize,
    pub diff_pct: f64,
}

/// Computes perceptual YIQ color delta (matching pixelmatch's NTSC YIQ metric) between two RGBA8 buffers.
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

    let max_delta = 35215.0 * threshold * threshold;
    let mut mismatched = 0usize;

    for (px_a, px_b) in img_a[..expected_len]
        .chunks_exact(4)
        .zip(img_b[..expected_len].chunks_exact(4))
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
            for rgb in raw.chunks_exact(3) {
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
        let px = [12u8, 34, 56, 255, 200, 100, 50, 255];
        let res = perceptual_rgba_diff(&px, &px, 2, 1, 0.1).unwrap();
        assert_eq!(res.mismatched_pixels, 0);
        assert_eq!(res.diff_pct, 0.0);
    }

    #[test]
    fn contrasting_pixel_is_counted() {
        let a = [10u8, 10, 10, 255, 10, 10, 10, 255];
        let b = [10u8, 10, 10, 255, 250, 40, 40, 255];
        let res = perceptual_rgba_diff(&a, &b, 2, 1, 0.1).unwrap();
        assert_eq!(res.mismatched_pixels, 1);
        assert!((res.diff_pct - 50.0).abs() < 1e-6);
    }
}
