import type { StartMlnTileWorker } from './mln-protocol';

interface MlnTileBindings {
  default: (opts: { module_or_path: WebAssembly.Module }) => Promise<unknown>;
  mlnWebServeTileWorker: (port: MessagePort) => void;
}

let port: MessagePort | null = null;
let dead = false;

function reportFatal(err: unknown) {
  if (dead) return;
  dead = true;
  const panicMsg = (self as unknown as { mlnPanic?: string }).mlnPanic;
  port?.postMessage({ fatal: panicMsg ?? String(err) });
}

self.addEventListener('error', (e) => reportFatal(e.error ?? e.message));
self.addEventListener('unhandledrejection', (e) => reportFatal(e.reason));

self.onmessage = async ({ data }: MessageEvent<StartMlnTileWorker>) => {
  port = data.port;
  try {
    const jsUrl =
      data.backend === 'webgl2'
        ? `${data.origin}/wasm/mln/pkg/webgl/mln_web.js`
        : `${data.origin}/wasm/mln/pkg/mln_web.js`;
    const bindings = (await import(/* @vite-ignore */ jsUrl)) as MlnTileBindings;
    await bindings.default({ module_or_path: data.module });
    bindings.mlnWebServeTileWorker(data.port);
  } catch (err) {
    reportFatal(err);
  }
};
