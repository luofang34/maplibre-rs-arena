import type { CameraPose, ScenarioSpec } from './types';

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function smoothstep(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

function interpolateKeyframes(keyframes: CameraPose[], t: number): CameraPose {
  if (keyframes.length === 1) return keyframes[0]!;
  const clamped = Math.max(0, Math.min(1, t));
  const scaled = clamped * (keyframes.length - 1);
  const idx = Math.min(keyframes.length - 2, Math.floor(scaled));
  const localT = smoothstep(scaled - idx);
  const a = keyframes[idx]!;
  const b = keyframes[idx + 1]!;
  return {
    lng: lerp(a.lng, b.lng, localT),
    lat: lerp(a.lat, b.lat, localT),
    zoom: lerp(a.zoom, b.zoom, localT),
    bearing: lerp(a.bearing, b.bearing, localT),
    pitch: lerp(a.pitch, b.pitch, localT),
  };
}

export const SCENARIOS: ScenarioSpec[] = [
  {
    id: 's1-urban-2d',
    code: 'S1',
    title: 'S1 · 2D Dense Urban Vector & POI (Amsterdam)',
    category: '2D Vector',
    description:
      'OpenFreeMap Liberty dense urban vector tile zoom & pan sweep, evaluating MVT decoding throughput and steady-state symbol collision timing.',
    styleUrl: 'https://tiles.openfreemap.org/styles/liberty',
    initialCamera: { lng: 4.8952, lat: 52.3702, zoom: 14.2, bearing: 0, pitch: 0 },
    durationMs: 7000,
    targetBudgetMs: 16.67,
    flightPoseAt: (t) =>
      interpolateKeyframes(
        [
          { lng: 4.8952, lat: 52.3702, zoom: 12.6, bearing: 0, pitch: 0 },
          { lng: 4.9015, lat: 52.3731, zoom: 15.8, bearing: 18, pitch: 0 },
          { lng: 4.8835, lat: 52.3665, zoom: 14.5, bearing: -12, pitch: 0 },
        ],
        t,
      ),
  },
  {
    id: 's2-cjk-shaping',
    code: 'S2',
    title: 'S2 · CJK & Multilingual Label Shaping (Tokyo)',
    category: 'Text & CJK',
    description:
      'High-density CJK + Latin mixed scripts in central Tokyo, comparing zero-download local CJK SDF rasterization and HarfRust shaping across both engines.',
    styleUrl: 'https://tiles.openfreemap.org/styles/bright',
    initialCamera: { lng: 139.7671, lat: 35.6812, zoom: 14.6, bearing: 0, pitch: 20 },
    expCapabilityNote: 'OffscreenCanvas 2D CJK SDF + Arabic shaping + optional HarfRust GSUB/GPOS',
    mlnCapabilityNote: 'On-demand mln_web_shaper (HarfRust + skrifa) + localIdeographFontFamily CJK SDF',
    durationMs: 7000,
    targetBudgetMs: 16.67,
    flightPoseAt: (t) =>
      interpolateKeyframes(
        [
          { lng: 139.7671, lat: 35.6812, zoom: 13.5, bearing: 0, pitch: 15 },
          { lng: 139.7016, lat: 35.6595, zoom: 15.6, bearing: 32, pitch: 28 },
          { lng: 139.7514, lat: 35.6938, zoom: 14.8, bearing: -20, pitch: 18 },
        ],
        t,
      ),
  },
  {
    id: 's3-extrusion-3d',
    code: 'S3',
    title: 'S3 · 3D Fill-Extrusion High-Pitch Orbit (Manhattan 60°)',
    category: '3D Extrusion',
    description:
      '360° orbit over Lower & Midtown Manhattan dense fill-extrusion skyscrapers at 60° pitch, stressing depth sorting, draw calls, and near/far clip planes.',
    styleUrl: 'https://tiles.openfreemap.org/styles/liberty',
    initialCamera: { lng: -74.009, lat: 40.7082, zoom: 15.9, bearing: -36, pitch: 60 },
    durationMs: 8000,
    targetBudgetMs: 16.67,
    flightPoseAt: (t) => ({
      lng: lerp(-74.012, -73.985, smoothstep(t)),
      lat: lerp(40.706, 40.748, smoothstep(t)),
      zoom: 15.7 + Math.sin(t * Math.PI) * 0.5,
      bearing: -36 + t * 240,
      pitch: 60,
    }),
  },
  {
    id: 's4-globe-polar',
    code: 'S4',
    title: 'S4 · Globe Space-to-Street Dive & Polar Pan',
    category: 'Globe',
    description:
      'Evaluates projection: globe mesh subdivision, atmosphere horizon blend, seamless space-to-street zoom (z=1.8 → z=12.8), and polar free-bearing.',
    styleUrl: '/styles/s4-globe.json',
    initialCamera: { lng: 11.25, lat: 38.5, zoom: 2.1, bearing: 0, pitch: 18 },
    globeFreeBearing: true,
    durationMs: 8000,
    targetBudgetMs: 16.67,
    flightPoseAt: (t) =>
      interpolateKeyframes(
        [
          { lng: 11.25, lat: 38.5, zoom: 1.8, bearing: 0, pitch: 10 },
          { lng: 18.0, lat: 76.0, zoom: 3.6, bearing: 35, pitch: 25 },
          { lng: 8.5417, lat: 47.3769, zoom: 12.8, bearing: -18, pitch: 48 },
        ],
        t,
      ),
  },
  {
    id: 's5-terrain-3d',
    code: 'S5',
    title: 'S5 · 3D DEM Terrain Mesh & Vector Draping (Swiss/Austrian Alps)',
    category: '3D Terrain',
    description:
      'Core differentiator: AWS Terrarium 3D elevation mesh + draped roads/water/buildings (DrapeCache) + hillshade through Alpine valleys at 66° pitch.',
    styleUrl: '/styles/s5-terrain-3d.json',
    initialCamera: { lng: 11.392, lat: 47.269, zoom: 12.7, bearing: 142, pitch: 66 },
    expCapabilityNote: 'Full 3D DEM terrain mesh + vector DrapeCache + camera ground-clamp',
    mlnCapabilityNote: '2D hillshade only (style.terrain 3D elevation mesh not implemented)',
    durationMs: 8500,
    targetBudgetMs: 16.67,
    flightPoseAt: (t) =>
      interpolateKeyframes(
        [
          { lng: 11.392, lat: 47.269, zoom: 12.4, bearing: 142, pitch: 66 },
          { lng: 11.18, lat: 47.12, zoom: 13.4, bearing: 168, pitch: 68 },
          { lng: 10.985, lat: 47.421, zoom: 12.9, bearing: 95, pitch: 62 },
        ],
        t,
      ),
  },
  {
    id: 's6-dynamic-stress',
    code: 'S6',
    title: 'S6 · Dynamic GeoJSON & Expression Stress (900 Live Nodes)',
    category: 'Dynamic Data',
    description:
      'Continuously mutates a 900-node urban sensor grid while orbiting San Francisco, measuring P95/P99 frame jitter under live data-driven expressions.',
    styleUrl: '/styles/s6-feature-state.json',
    initialCamera: { lng: -122.4194, lat: 37.7749, zoom: 13.6, bearing: 24, pitch: 48 },
    dynamicGeoJsonStress: true,
    durationMs: 7000,
    targetBudgetMs: 16.67,
    flightPoseAt: (t) => ({
      lng: -122.4194 + Math.cos(t * Math.PI * 2) * 0.02,
      lat: 37.7749 + Math.sin(t * Math.PI * 2) * 0.015,
      zoom: 13.6 + Math.sin(t * Math.PI) * 0.4,
      bearing: 24 + t * 90,
      pitch: 48,
    }),
  },
  {
    id: 's7-xr-stereo',
    code: 'S7',
    title: 'S7 · XR / WebXR Dual-Eye Stereo 90Hz Budget Simulator',
    category: 'XR Stereo',
    description:
      'Simulates left/right HMD stereo IPD parallax + 6DoF head micro-motion over 3D Alpine terrain against a strict 90Hz (11.11ms) VR/XR frame budget.',
    styleUrl: '/styles/s5-terrain-3d.json',
    initialCamera: { lng: 7.6586, lat: 45.9763, zoom: 13.1, bearing: -28, pitch: 65 },
    stereoIpdSimulation: true,
    expCapabilityNote: 'Native HeadlessMap::run_xr_frame + CoveringPolicy::StereoReuse + visionOS target',
    mlnCapabilityNote: 'No native XR multi-view stereo pipeline; Web requires dual independent instances',
    durationMs: 7500,
    targetBudgetMs: 11.11,
    flightPoseAt: (t) => ({
      lng: 7.6586 + Math.sin(t * Math.PI * 2) * 0.018,
      lat: 45.9763 + Math.cos(t * Math.PI * 2) * 0.012,
      zoom: 13.1 + Math.sin(t * Math.PI * 4) * 0.18,
      bearing: -28 + Math.sin(t * Math.PI * 3) * 22,
      pitch: 64 + Math.cos(t * Math.PI * 4) * 4,
    }),
  },
  {
    id: 's8-memory-tour',
    code: 'S8',
    title: 'S8 · Cross-Continent Tile Eviction & Memory Watermark Tour',
    category: 'Memory Stress',
    description:
      'Rapid long-haul hops across London → Zurich → Singapore to audit WASM linear memory growth, GPU buffer/texture watermarks, and tile cache eviction.',
    styleUrl: 'https://tiles.openfreemap.org/styles/liberty',
    initialCamera: { lng: -0.1276, lat: 51.5072, zoom: 14.4, bearing: 0, pitch: 45 },
    durationMs: 9000,
    targetBudgetMs: 16.67,
    flightPoseAt: (t) =>
      interpolateKeyframes(
        [
          { lng: -0.1276, lat: 51.5072, zoom: 14.4, bearing: 0, pitch: 45 },
          { lng: 4.5, lat: 49.2, zoom: 6.2, bearing: 25, pitch: 20 },
          { lng: 8.5417, lat: 47.3769, zoom: 14.8, bearing: -15, pitch: 52 },
          { lng: 103.8519, lat: 1.2903, zoom: 14.6, bearing: 40, pitch: 50 },
        ],
        t,
      ),
  },
];

export function getScenarioById(id: string | null | undefined): ScenarioSpec {
  return SCENARIOS.find((s) => s.id === id || s.code.toLowerCase() === id?.toLowerCase()) ?? SCENARIOS[0]!;
}
