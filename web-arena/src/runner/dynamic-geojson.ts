import type { CameraPose } from '../shared/types';

export interface GeoJsonFeatureCollection {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    id: number;
    properties: { load: number };
    geometry: { type: 'Point'; coordinates: [number, number] };
  }>;
}

/**
 * Generates a deterministic 900-node sensor grid around the active camera
 * so S6 stresses GeoJSON source updates + data-driven interpolation expressions identically.
 */
export function buildSensorGrid(center: CameraPose, tick: number): GeoJsonFeatureCollection {
  const rows = 30;
  const cols = 30;
  const spanLng = 0.06;
  const spanLat = 0.045;
  const startLng = -122.4194 - spanLng / 2;
  const startLat = 37.7749 - spanLat / 2;
  const phase = tick * 0.18;

  const features: GeoJsonFeatureCollection['features'] = [];
  let id = 1;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const lng = startLng + (c / (cols - 1)) * spanLng;
      const lat = startLat + (r / (rows - 1)) * spanLat;
      const wave = 0.5 + 0.5 * Math.sin(phase + r * 0.35 + c * 0.28 + center.bearing * 0.02);
      features.push({
        type: 'Feature',
        id: id++,
        properties: { load: Number(wave.toFixed(3)) },
        geometry: { type: 'Point', coordinates: [lng, lat] },
      });
    }
  }
  return { type: 'FeatureCollection', features };
}
