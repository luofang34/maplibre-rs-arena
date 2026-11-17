import type { StartMlnTileWorker } from './mln-protocol';

interface MlnTileBindings {
  default: (opts: { module_or_path: WebAssembly.Module }) => Promise<unknown>;
  WebMap?: {
    prototype?: {
      drain_frames?: () => number;
    };
  };
  mlnWebServeTileWorker: (port: MessagePort) => void;
}

let controlOrDirectPort: MessagePort | null = null;
const sessionPorts: MessagePort[] = [];
let dead: string | null = null;

function reportFatal(err: unknown) {
  if (dead !== null) return;
  dead = (self as unknown as { mlnPanic?: string }).mlnPanic ?? String(err);
  controlOrDirectPort?.postMessage({ fatal: dead });
  for (const p of sessionPorts) {
    p.postMessage({ fatal: dead });
  }
}

self.addEventListener('error', (e) => reportFatal(e.error ?? e.message));
self.addEventListener('unhandledrejection', (e) => reportFatal(e.reason));

self.onmessage = async ({ data }: MessageEvent<StartMlnTileWorker>) => {
  controlOrDirectPort = data.port;
  try {
    const jsUrl =
      data.backend === 'webgl2'
        ? `${data.origin}/wasm/mln/pkg/webgl/mln_web.js`
        : `${data.origin}/wasm/mln/pkg/mln_web.js`;
    const bindings = (await import(/* @vite-ignore */ jsUrl)) as MlnTileBindings;
    await bindings.default({ module_or_path: data.module });
    const isSessionAbi = typeof bindings.WebMap?.prototype?.drain_frames === 'function';
    if (isSessionAbi) {
      // Newer `18af76217b+` ABI uses `data.port` as a control channel over which each render
      // session sends `{ port: sessionPort }` messages.
      data.port.onmessage = ({ data: msg }: MessageEvent<{ port?: MessagePort }>) => {
        const sessionPort = msg?.port;
        if (!sessionPort) return;
        if (dead !== null) {
          sessionPort.postMessage({ fatal: dead });
          return;
        }
        sessionPorts.push(sessionPort);
        const origPost = sessionPort.postMessage.bind(sessionPort);
        sessionPort.postMessage = ((payload: unknown, transfer: Transferable[]) => {
          if (Array.isArray(payload)) {
            controlOrDirectPort?.postMessage({ replies: payload.length });
          }
          origPost(payload, transfer);
        }) as typeof sessionPort.postMessage;
        try {
          bindings.mlnWebServeTileWorker(sessionPort);
        } catch (err) {
          reportFatal(err);
        }
      };
    } else {
      // Baseline `0ca2ff95fb` ABI serves tile requests directly on `data.port`.
      bindings.mlnWebServeTileWorker(data.port);
    }
  } catch (err) {
    reportFatal(err);
  }
};
