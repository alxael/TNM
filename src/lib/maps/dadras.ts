import { registerMap, type MapDefinition } from '../mapDefinition';
import { odeGenerate } from '../odeHelper';

// Exact values from https://sequelaencollection.home.blog/3d-chaotic-attractors/
const p = 3, o = 2.7, r = 1.7, c = 2, e = 9;
const DT = 0.005;
const WARMUP = 2000;
const SCALE = 2;

const opts = {
  derivs: (x: number, y: number, z: number): [number, number, number] => [
    y - p * x + o * y * z,
    r * y - x * z + z,
    c * x * y - e * z,
  ],
  dt: DT,
  warmup: WARMUP,
  scale: SCALE,
};

export const dadrasMap: MapDefinition = {
  id: 'dadras',
  label: 'Dadras Attractor',
  description: '5-parameter chaotic system',
  icon: 'Fire',

  generate: (iterations, x0, y0, z0) => odeGenerate(opts, iterations, x0, y0, z0),

  worldToAttractor: (wx, wy, wz) => ({ x: wx / SCALE, y: wy / SCALE, z: wz / SCALE }),

  initialConditions: [
    { x: 1, y: 1, z: 0 },
    { x: 1, y: 0, z: 1 },
    { x: 0, y: 1, z: 1 },
    { x: -1, y: 1, z: 0 },
  ],

  cameraPosition: { x: 25, y: 20, z: 50 },
  axisBox: { hx: 25, hy: 25, hz: 25 },

  info: {
    equations: [
      'ẋ = y − px + oyz',
      'ẏ = ry − xz + z',
      'ż = cxy − ez',
    ],
    parameters: `p = ${p}, o = ${o}, r = ${r}, c = ${c}, e = ${e}`,
    notes: 'Initial point (1, 1, 0).',
  },
};

registerMap(dadrasMap);
