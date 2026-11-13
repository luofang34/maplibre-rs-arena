use std::process::Command;
use std::time::Instant;

#[derive(Debug, Clone, Copy)]
pub struct ProcessSample {
    pub wall_ms: f64,
    pub cpu_ms: f64,
    pub peak_rss_mib: f64,
}

#[cfg(unix)]
pub fn run_measured(cmd: &mut Command) -> Result<(ProcessSample, std::process::Output), String> {
    use std::os::unix::process::ExitStatusExt;

    cmd.stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped());

    let t0 = Instant::now();
    let child = cmd.spawn().map_err(|e| format!("spawn failed: {e}"))?;
    let pid = child.id() as libc::pid_t;

    // Drain stdout/stderr concurrently via wait_with_output? Note: wait_with_output calls waitpid internally,
    // which would consume the child before wait4. Instead read pipes after wait4 (safe for short JSON/log outputs)
    // or spawn reader threads for arbitrary output sizes.
    let mut child = child;
    let mut stdout_pipe = child.stdout.take();
    let mut stderr_pipe = child.stderr.take();

    let out_handle = std::thread::spawn(move || {
        use std::io::Read;
        let mut buf = Vec::new();
        if let Some(ref mut s) = stdout_pipe {
            let _ = s.read_to_end(&mut buf);
        }
        buf
    });
    let err_handle = std::thread::spawn(move || {
        use std::io::Read;
        let mut buf = Vec::new();
        if let Some(ref mut s) = stderr_pipe {
            let _ = s.read_to_end(&mut buf);
        }
        buf
    });

    let mut status_raw: libc::c_int = 0;
    let mut rusage: libc::rusage = unsafe { std::mem::zeroed() };
    let waited = unsafe { libc::wait4(pid, &mut status_raw, 0, &mut rusage) };
    let wall_ms = t0.elapsed().as_secs_f64() * 1000.0;
    if waited < 0 {
        return Err(format!("wait4 failed for pid {pid}"));
    }

    let stdout = out_handle.join().unwrap_or_default();
    let stderr = err_handle.join().unwrap_or_default();

    let user_ms = (rusage.ru_utime.tv_sec as f64) * 1000.0 + (rusage.ru_utime.tv_usec as f64) / 1000.0;
    let sys_ms = (rusage.ru_stime.tv_sec as f64) * 1000.0 + (rusage.ru_stime.tv_usec as f64) / 1000.0;

    #[cfg(target_os = "macos")]
    let peak_rss_mib = (rusage.ru_maxrss as f64) / (1024.0 * 1024.0);
    #[cfg(not(target_os = "macos"))]
    let peak_rss_mib = (rusage.ru_maxrss as f64) / 1024.0;

    let output = std::process::Output {
        status: std::process::ExitStatus::from_raw(status_raw),
        stdout,
        stderr,
    };

    Ok((
        ProcessSample {
            wall_ms,
            cpu_ms: user_ms + sys_ms,
            peak_rss_mib,
        },
        output,
    ))
}

#[cfg(not(unix))]
pub fn run_measured(cmd: &mut Command) -> Result<(ProcessSample, std::process::Output), String> {
    let t0 = Instant::now();
    let output = cmd.output().map_err(|e| format!("exec failed: {e}"))?;
    let wall_ms = t0.elapsed().as_secs_f64() * 1000.0;
    Ok((
        ProcessSample {
            wall_ms,
            cpu_ms: wall_ms,
            peak_rss_mib: 0.0,
        },
        output,
    ))
}
