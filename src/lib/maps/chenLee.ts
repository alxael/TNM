import { registerMap, type MapDefinition } from '../mapDefinition';
import { odeGenerate } from '../odeHelper';

// Exact values from https://sequelaencollection.home.blog/3d-chaotic-attractors/
const a = 5, b = -10, d = -0.38;
const DT = 0.005;
const WARMUP = 2000;
const SCALE = 1;

const opts = {
  derivs: (x: number, y: number, z: number): [number, number, number] => [
    a * x - y * z,
    b * y + x * z,
    d * z + (x * y) / 3,
  ],
  dt: DT,
  warmup: WARMUP,
  scale: SCALE,
};

export const chenLeeMap: MapDefinition = {
  id: 'chen-lee',
  label: 'Chen-Lee Attractor',
  description: '3-parameter chaotic system',
  icon: 'Molecule',

  generate: (iterations, x0, y0, z0) => odeGenerate(opts, iterations, x0, y0, z0),

  worldToAttractor: (wx, wy, wz) => ({ x: wx / SCALE, y: wy / SCALE, z: wz / SCALE }),

  initialConditions: [
    { x: 1, y: 1, z: 2 },
    { x: 1, y: 0, z: 1 },
    { x: 0, y: 1, z: 1 },
    { x: 2, y: 1, z: 1 },
  ],

  cameraPosition: { x: 40, y: 30, z: 80 },
  axisBox: { hx: 30, hy: 30, hz: 30 },

  info: {
    equations: [
      'ẋ = ax − yz',
      'ẏ = by + xz',
      'ż = dz + xy/3',
    ],
    parameters: `a = ${a}, b = ${b}, d = ${d}`,
    notes: 'Initial point (1, 1, 2).',
  },
};

registerMap(chenLeeMap);
