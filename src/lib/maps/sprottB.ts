import { registerMap, type MapDefinition } from '../mapDefinition';
import { odeGenerate } from '../odeHelper';

// Exact values from https://sequelaencollection.home.blog/3d-chaotic-attractors/
const a = 0.4, b = 1.2, c = 1;
const DT = 0.01;
const WARMUP = 2000;
const SCALE = 8;

const opts = {
  derivs: (x: number, y: number, z: number): [number, number, number] => [
    a * y * z,
    x - b * y,
    c - x * y,
  ],
  dt: DT,
  warmup: WARMUP,
  scale: SCALE,
};

export const sprottBMap: MapDefinition = {
  id: 'sprott-b',
  label: 'Sprott B Attractor',
  description: 'Clint Sprott · 3-parameter system',
  icon: 'Sparkle',

  generate: (iterations, x0, y0, z0) => odeGenerate(opts, iterations, x0, y0, z0),

  worldToAttractor: (wx, wy, wz) => ({ x: wx / SCALE, y: wy / SCALE, z: wz / SCALE }),

  initialConditions: [
    { x: 0.1, y: 0, z: 0 },
    { x: 0.1, y: 0.1, z: 0 },
    { x: 0, y: 0.1, z: 0.1 },
    { x: 0.1, y: 0, z: 0.1 },
  ],

  cameraPosition: { x: 20, y: 15, z: 40 },
  axisBox: { hx: 20, hy: 20, hz: 20 },

  info: {
    equations: [
      'ẋ = ayz',
      'ẏ = x − by',
      'ż = c − xy',
    ],
    parameters: `a = ${a}, b = ${b}, c = ${c}`,
    notes: 'Initial point (0.1, 0, 0).',
  },
};

registerMap(sprottBMap);
