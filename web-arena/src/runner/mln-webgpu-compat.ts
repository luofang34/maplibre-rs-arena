/**
 * Safari / WebKit WebGPU compatibility shim for the unmodified `mln-rs` WASM baseline.
 *
 * Safari's WebGPU implementation leaves `GPUAdapterInfo` string getters (`description`, `vendor`,
 * `architecture`, `device`) and numeric/boolean fields (`subgroupMinSize`, `subgroupMaxSize`,
 * `isFallbackAdapter`) `undefined` on some OS/browser versions. `wgpu`'s `wasm-bindgen` glue inside
 * `mln_web.js` passes `adapterInfo.description` straight into `passStringToWasm0` without an
 * `isLikeNone` check, throwing `TypeError: arg.charCodeAt is not a function` in Safari.
 */

const STRING_DEFAULTS: ReadonlyArray<readonly [string, string]> = [
  ['vendor', ''],
  ['architecture', ''],
  ['device', ''],
  ['description', ''],
];

const SCALAR_DEFAULTS: ReadonlyArray<readonly [string, number | boolean]> = [
  ['subgroupMinSize', 0],
  ['subgroupMaxSize', 0],
  ['isFallbackAdapter', false],
];

function patchStringGetter(proto: object, prop: string, fallback: string): void {
  const desc = Object.getOwnPropertyDescriptor(proto, prop);
  if (!desc) {
    Object.defineProperty(proto, prop, {
      configurable: true,
      enumerable: true,
      get: () => fallback,
    });
    return;
  }
  if (typeof desc.get === 'function') {
    const origGet = desc.get;
    Object.defineProperty(proto, prop, {
      configurable: true,
      enumerable: desc.enumerable ?? true,
      get() {
        const val = origGet.call(this);
        return typeof val === 'string' ? val : fallback;
      },
    });
  }
}

function patchScalarGetter(proto: object, prop: string, fallback: number | boolean): void {
  const expectedType = typeof fallback;
  const desc = Object.getOwnPropertyDescriptor(proto, prop);
  if (!desc) {
    Object.defineProperty(proto, prop, {
      configurable: true,
      enumerable: true,
      get: () => fallback,
    });
    return;
  }
  if (typeof desc.get === 'function') {
    const origGet = desc.get;
    Object.defineProperty(proto, prop, {
      configurable: true,
      enumerable: desc.enumerable ?? true,
      get() {
        const val = origGet.call(this);
        return typeof val === expectedType ? val : fallback;
      },
    });
  }
}

function sanitizeAdapterInfoObject<T extends object>(info: T): T {
  for (const [prop, fallback] of STRING_DEFAULTS) {
    const val = (info as Record<string, unknown>)[prop];
    if (typeof val !== 'string') {
      try {
        Object.defineProperty(info, prop, {
          configurable: true,
          enumerable: true,
          value: fallback,
        });
      } catch {
        // Prototype getter patch already covers non-configurable instances.
      }
    }
  }
  for (const [prop, fallback] of SCALAR_DEFAULTS) {
    const val = (info as Record<string, unknown>)[prop];
    if (typeof val !== typeof fallback) {
      try {
        Object.defineProperty(info, prop, {
          configurable: true,
          enumerable: true,
          value: fallback,
        });
      } catch {
        // Ignore non-configurable own properties.
      }
    }
  }
  return info;
}

export function ensureMlnWebGpuCompat(scope: Record<string, any> = globalThis as Record<string, any>): void {
  const AdapterInfoCtor = scope.GPUAdapterInfo as { prototype?: object } | undefined;
  if (AdapterInfoCtor?.prototype) {
    for (const [prop, fallback] of STRING_DEFAULTS) {
      patchStringGetter(AdapterInfoCtor.prototype, prop, fallback);
    }
    for (const [prop, fallback] of SCALAR_DEFAULTS) {
      patchScalarGetter(AdapterInfoCtor.prototype, prop, fallback);
    }
  }

  const AdapterCtor = scope.GPUAdapter as { prototype?: Record<string, any> } | undefined;
  if (AdapterCtor?.prototype) {
    const infoDesc = Object.getOwnPropertyDescriptor(AdapterCtor.prototype, 'info');
    if (typeof infoDesc?.get === 'function') {
      const origInfoGet = infoDesc.get;
      Object.defineProperty(AdapterCtor.prototype, 'info', {
        configurable: true,
        enumerable: infoDesc.enumerable ?? true,
        get() {
          const raw = origInfoGet.call(this);
          return raw && typeof raw === 'object' ? sanitizeAdapterInfoObject(raw) : sanitizeAdapterInfoObject({});
        },
      });
    } else if (!infoDesc) {
      Object.defineProperty(AdapterCtor.prototype, 'info', {
        configurable: true,
        enumerable: true,
        get() {
          return sanitizeAdapterInfoObject({});
        },
      });
    }

    if (typeof AdapterCtor.prototype.requestAdapterInfo === 'function') {
      const origReqInfo = AdapterCtor.prototype.requestAdapterInfo;
      AdapterCtor.prototype.requestAdapterInfo = async function (...args: unknown[]) {
        const raw = await origReqInfo.apply(this, args);
        return raw && typeof raw === 'object' ? sanitizeAdapterInfoObject(raw) : sanitizeAdapterInfoObject({});
      };
    }
  }

  const DeviceCtor = scope.GPUDevice as { prototype?: Record<string, any> } | undefined;
  if (DeviceCtor?.prototype) {
    patchStringGetter(DeviceCtor.prototype, 'label', '');
    const adapterInfoDesc = Object.getOwnPropertyDescriptor(DeviceCtor.prototype, 'adapterInfo');
    if (typeof adapterInfoDesc?.get === 'function') {
      const origGet = adapterInfoDesc.get;
      Object.defineProperty(DeviceCtor.prototype, 'adapterInfo', {
        configurable: true,
        enumerable: adapterInfoDesc.enumerable ?? true,
        get() {
          const raw = origGet.call(this);
          return raw && typeof raw === 'object' ? sanitizeAdapterInfoObject(raw) : sanitizeAdapterInfoObject({});
        },
      });
    }
  }

  const LostInfoCtor = scope.GPUDeviceLostInfo as { prototype?: object } | undefined;
  if (LostInfoCtor?.prototype) {
    patchStringGetter(LostInfoCtor.prototype, 'message', '');
  }
}
