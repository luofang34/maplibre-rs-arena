use std::cmp::Ordering;

pub fn median(samples: &[f64]) -> f64 {
    if samples.is_empty() {
        return 0.0;
    }
    let mut sorted = samples.to_vec();
    sorted.sort_by(|a, b| a.partial_cmp(b).unwrap_or(Ordering::Equal));
    let mid = sorted.len() / 2;
    if sorted.len() % 2 == 1 {
        sorted[mid]
    } else {
        0.5 * (sorted[mid - 1] + sorted[mid])
    }
}

/// Generates an ABBA interleaved execution schedule across `rounds` pairs (`A, B, B, A` per round)
/// to cancel thermal throttling and OS background drift.
pub fn abba_schedule(rounds: usize) -> Vec<bool> {
    let mut seq = Vec::with_capacity(rounds * 4);
    for _ in 0..rounds {
        seq.extend_from_slice(&[true, false, false, true]);
    }
    seq
}

/// Two-sided Mann-Whitney U test with normal approximation, continuity correction, and tie adjustment.
pub fn mann_whitney_u(a: &[f64], b: &[f64]) -> (f64, f64) {
    let n1 = a.len();
    let n2 = b.len();
    if n1 == 0 || n2 == 0 {
        return (0.0, 1.0);
    }

    let mut combined: Vec<(f64, bool)> = Vec::with_capacity(n1 + n2);
    combined.extend(a.iter().copied().map(|v| (v, true)));
    combined.extend(b.iter().copied().map(|v| (v, false)));
    combined.sort_by(|x, y| x.0.partial_cmp(&y.0).unwrap_or(Ordering::Equal));

    let total = combined.len();
    let mut ranks = vec![0.0; total];
    let mut tie_term = 0.0;

    let mut i = 0;
    while i < total {
        let mut j = i + 1;
        while j < total && (combined[j].0 - combined[i].0).abs() <= 1e-12 {
            j += 1;
        }
        let avg_rank = 0.5 * ((i + 1 + j) as f64);
        for r in &mut ranks[i..j] {
            *r = avg_rank;
        }
        let t = (j - i) as f64;
        if t > 1.0 {
            tie_term += t.powi(3) - t;
        }
        i = j;
    }

    let rank_sum_a: f64 = combined
        .iter()
        .zip(ranks.iter())
        .filter(|((_, is_a), _)| *is_a)
        .map(|(_, r)| *r)
        .sum();

    let n1_f = n1 as f64;
    let n2_f = n2 as f64;
    let n_f = (n1 + n2) as f64;
    let u1 = rank_sum_a - n1_f * (n1_f + 1.0) * 0.5;
    let u2 = n1_f * n2_f - u1;
    let u = u1.min(u2);

    let mu = 0.5 * n1_f * n2_f;
    let tie_corr = if n_f > 1.0 {
        tie_term / (n_f * (n_f - 1.0))
    } else {
        0.0
    };
    let var = (n1_f * n2_f / 12.0) * ((n_f + 1.0) - tie_corr);
    if var <= 1e-12 {
        return (u, 1.0);
    }

    let z = ((u - mu).abs() - 0.5).max(0.0) / var.sqrt();
    let p = (2.0 * (1.0 - standard_normal_cdf(z))).clamp(0.0, 1.0);
    (u, p)
}

/// Holm-Bonferroni step-down family-wise error rate adjustment.
pub fn holm_bonferroni(raw_p: &[f64]) -> Vec<f64> {
    let m = raw_p.len();
    if m == 0 {
        return Vec::new();
    }
    let mut indexed: Vec<(usize, f64)> = raw_p.iter().copied().enumerate().collect();
    indexed.sort_by(|a, b| a.1.partial_cmp(&b.1).unwrap_or(Ordering::Equal));

    let mut adjusted = vec![1.0; m];
    let mut running_max: f64 = 0.0;
    for (k, (orig_idx, p)) in indexed.into_iter().enumerate() {
        let factor = (m - k) as f64;
        let adj = (p * factor).min(1.0);
        running_max = running_max.max(adj);
        adjusted[orig_idx] = running_max;
    }
    adjusted
}

fn standard_normal_cdf(x: f64) -> f64 {
    // Abramowitz & Stegun 7.1.26 rational approximation (max error < 1.5e-7)
    let sign = if x < 0.0 { -1.0 } else { 1.0 };
    let z = x.abs() / std::f64::consts::SQRT_2;
    let t = 1.0 / (1.0 + 0.3275911 * z);
    let poly = (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t
        + 0.254829592)
        * t;
    let erf = sign * (1.0 - poly * (-z * z).exp());
    0.5 * (1.0 + erf)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn abba_schedule_is_balanced_and_symmetric() {
        let seq = abba_schedule(3);
        assert_eq!(seq.len(), 12);
        assert_eq!(seq.iter().filter(|&&x| x).count(), 6);
        assert_eq!(&seq[0..4], &[true, false, false, true]);
    }

    #[test]
    fn mann_whitney_detects_clear_separation() {
        let fast = [2.01, 2.04, 2.02, 2.05, 2.03, 2.00];
        let slow = [3.40, 3.55, 3.48, 3.51, 3.44, 3.60];
        let (u, p) = mann_whitney_u(&fast, &slow);
        assert_eq!(u, 0.0);
        assert!(p < 0.01, "expected significant p < 0.01, got {p}");
    }

    #[test]
    fn holm_bonferroni_is_monotonic() {
        let raw = [0.004, 0.021, 0.20];
        let adj = holm_bonferroni(&raw);
        assert!((adj[0] - 0.012).abs() < 1e-9);
        assert!((adj[1] - 0.042).abs() < 1e-9);
        assert!((adj[2] - 0.20).abs() < 1e-9);
    }
}
