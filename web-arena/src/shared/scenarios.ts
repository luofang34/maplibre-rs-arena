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
    title: 'S1 · 2D 高密城市路网与 POI (Amsterdam)',
    category: '2D Vector',
    description: 'OpenFreeMap Liberty 标准城市高密矢量瓦片缩放与平移，检验瓦片解码吞吐与符号避让稳态帧耗时。',
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
    title: 'S2 · CJK 多语种文字排版与碰撞 (Tokyo)',
    category: 'Text & CJK',
    description: '高密度中日韩与多脚本混排标注，直接对比 mln-rs HarfRust/本地 CJK 光栅化与 maplibre-rs-experimental 符号管线。',
    styleUrl: 'https://tiles.openfreemap.org/styles/bright',
    initialCamera: { lng: 139.7671, lat: 35.6812, zoom: 14.6, bearing: 0, pitch: 20 },
    expCapabilityNote: '使用远程 PBF 字形栈与碰撞检测；暂未内置 HarfRust RTL 复杂连字塑形',
    mlnCapabilityNote: '内置 mln_web_shaper (HarfRust + skrifa) 与 localIdeographFontFamily 本地 CJK 生成',
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
    title: 'S3 · 3D 建筑挤压大倾角环绕 (Manhattan 65°)',
    category: '3D Extrusion',
    description: '曼哈顿密集 fill-extrusion 建筑群 65° 大倾角 360° 环绕，评估深度排序、半透明混合、Draw Calls 与远近裁剪面精度。',
    styleUrl: 'https://tiles.openfreemap.org/styles/liberty',
    initialCamera: { lng: -74.009, lat: 40.7082, zoom: 15.9, bearing: -36, pitch: 64 },
    durationMs: 8000,
    targetBudgetMs: 16.67,
    flightPoseAt: (t) => ({
      lng: lerp(-74.012, -73.985, smoothstep(t)),
      lat: lerp(40.706, 40.748, smoothstep(t)),
      zoom: 15.7 + Math.sin(t * Math.PI) * 0.5,
      bearing: -36 + t * 240,
      pitch: 64,
    }),
  },
  {
    id: 's4-globe-polar',
    code: 'S4',
    title: 'S4 · Globe 球面太空俯冲与跨极地旋转',
    category: 'Globe',
    description: '验证 projection: globe 球面网格细分、大气边缘过渡、太空到街道（z=1.6 → z=13.5）无缝变焦及跨极点自由航向。',
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
    title: 'S5 · 3D DEM 地形起伏与矢量贴地 Draping (Alps)',
    category: '3D Terrain',
    description: '核心决胜场景：AWS Terrarium 高程网格 + 道路/水系/建筑 3D 贴地（DrapeCache）+ 山体阴影大倾角穿越阿尔卑斯山谷。',
    styleUrl: '/styles/s5-terrain-3d.json',
    initialCamera: { lng: 11.392, lat: 47.269, zoom: 12.7, bearing: 142, pitch: 66 },
    expCapabilityNote: '原生支持 3D DEM 网格高程起伏、矢量贴地 DrapeCache 及相机高程防穿模',
    mlnCapabilityNote: '当前仅支持 2D hillshade/color-relief，不支持 style.terrain 3D 高程网格（画面呈平面）',
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
    title: 'S6 · 高频动态 GeoJSON / 表达式压测 (1,000 节点)',
    category: 'Dynamic Data',
    description: '每帧动态驱动密集城市传感器脉冲点集与相机巡航，评测增量数据更新与插值表达式在连续帧下的 P99 抖动。',
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
    title: 'S7 · XR / WebXR 双目立体视口 90Hz 预算压测',
    category: 'XR Stereo',
    description: '模拟头显左/右眼双视口视差（IPD 偏移 + 6DoF 头部微动），以 90Hz (11.11ms) 帧预算检验双目立体渲染与眩晕掉帧率。',
    styleUrl: '/styles/s5-terrain-3d.json',
    initialCamera: { lng: 7.6586, lat: 45.9763, zoom: 13.1, bearing: -28, pitch: 65 },
    stereoIpdSimulation: true,
    expCapabilityNote: 'Native 具备 HeadlessMap::run_xr_frame + CoveringPolicy::StereoReuse 双目瓦片复用与 visionOS 工程',
    mlnCapabilityNote: '无原生 XR 多视图立体管线；Web 端退化为双实例独立渲染',
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
    title: 'S8 · 跨洲长航程瓦片淘汰与内存水位审计',
    category: 'Memory Stress',
    description: '连续跨越伦敦 → 苏黎世 → 新加坡三座高密城市大跨度跳跃，追踪 WASM 线性内存与 GPU 显存峰值及瓦片缓存回收行为。',
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
