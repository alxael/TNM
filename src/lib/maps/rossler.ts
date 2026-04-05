import { registerMap, type MapDefinition } from '../mapDefinition';
import { odeGenerate } from '../odeHelper';

// Exact values from https://sequelaencollection.home.blog/3d-chaotic-attractors/
const a = 0.2, b = 0.2, c = 5.7;
const DT = 0.01;
const WARMUP = 2000;
const SCALE = 1;

const opts = {
  derivs: (x: number, y: number, z: number): [number, number, number] => [
    -y - z,
    x + a * y,
    b + z * (x - c),
  ],
  dt: DT,
  warmup: WARMUP,
  scale: SCALE,
};

export const rosslerMap: MapDefinition = {
  id: 'rossler',
  label: 'Rössler Attractor',
  description: 'Otto Rössler · 3-parameter chaotic flow',
  icon: 'WeatherThunderstorm',

  generate: (iterations, x0, y0, z0) => odeGenerate(opts, iterations, x0, y0, z0),

  worldToAttractor: (wx, wy, wz) => ({ x: wx / SCALE, y: wy / SCALE, z: wz / SCALE }),

  initialConditions: [
    { x: 0.1, y: 0, z: 0 },
    { x: 1, y: 1, z: 0 },
    { x: -1, y: 0, z: 0 },
    { x: 0, y: -1, z: 0 },
  ],

  cameraPosition: { x: 20, y: 15, z: 55 },
  axisBox: { hx: 20, hy: 20, hz: 25 },

  info: {
    equations: [
      'ẋ = −y − z',
      'ẏ = x + ay',
      'ż = b + z(x − c)',
    ],
    parameters: `a = ${a}, b = ${b}, c = ${c}`,
    notes: 'a = b = 0.2, c = 5.7.',
  },
};

registerMap(rosslerMap);
