import { registerMap, type MapDefinition } from '../mapDefinition';
import { odeGenerate } from '../odeHelper';

// Exact values from https://sequelaencollection.home.blog/3d-chaotic-attractors/
const a = 1.4;
const DT = 0.005;
const WARMUP = 2000;
const SCALE = 1.5;

const opts = {
  derivs: (x: number, y: number, z: number): [number, number, number] => [
    -a * x - 4 * y - 4 * z - y * y,
    -a * y - 4 * z - 4 * x - z * z,
    -a * z - 4 * x - 4 * y - x * x,
  ],
  dt: DT,
  warmup: WARMUP,
  scale: SCALE,
};

export const halvorsenMap: MapDefinition = {
  id: 'halvorsen',
  label: 'Halvorsen Attractor',
  description: '1-parameter cyclically symmetric system',
  icon: 'WeatherSnowflake',

  generate: (iterations, x0, y0, z0) => odeGenerate(opts, iterations, x0, y0, z0),

  worldToAttractor: (wx, wy, wz) => ({ x: wx / SCALE, y: wy / SCALE, z: wz / SCALE }),

  initialConditions: [
    { x: 0.1, y: 0, z: 0 },
    { x: -1, y: 0, z: 0 },
    { x: 0, y: -1, z: 0 },
    { x: 0, y: 0, z: -1 },
  ],

  cameraPosition: { x: 25, y: 20, z: 55 },
  axisBox: { hx: 20, hy: 20, hz: 20 },

  info: {
    equations: [
      'ẋ = −ax − 4y − 4z − y²',
      'ẏ = −ay − 4z − 4x − z²',
      'ż = −az − 4x − 4y − x²',
    ],
    parameters: `a = ${a}`,
    notes: 'Initial point (0.1, 0, 0). Cyclically symmetric equations.',
  },
};

registerMap(halvorsenMap);
