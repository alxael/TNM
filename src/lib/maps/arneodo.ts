import { registerMap, type MapDefinition } from '../mapDefinition';
import { odeGenerate } from '../odeHelper';

// Exact values from https://sequelaencollection.home.blog/3d-chaotic-attractors/
// Page lists: a = -5.5, b = 3.5, d = -1
// Equation: dz/dt = -a*x - b*y - z + c*x³  (d in page params = c in equation)
const a = -5.5, b = 3.5, c = -1;
const DT = 0.01;
const WARMUP = 2000;
const SCALE = 5;

const opts = {
  derivs: (x: number, y: number, z: number): [number, number, number] => [
    y,
    z,
    -a * x - b * y - z + c * x * x * x,
  ],
  dt: DT,
  warmup: WARMUP,
  scale: SCALE,
};

export const arneodoMap: MapDefinition = {
  id: 'arneodo',
  label: 'Arneodo Attractor',
  description: '3-parameter chaotic system',
  icon: 'Diamond',

  generate: (iterations, x0, y0, z0) => odeGenerate(opts, iterations, x0, y0, z0),

  worldToAttractor: (wx, wy, wz) => ({ x: wx / SCALE, y: wy / SCALE, z: wz / SCALE }),

  initialConditions: [
    { x: 1, y: 1, z: 0 },
    { x: 0.5, y: 0.5, z: 0 },
    { x: -1, y: 1, z: 0 },
    { x: 1, y: -1, z: 0 },
  ],

  cameraPosition: { x: 20, y: 15, z: 50 },
  axisBox: { hx: 20, hy: 20, hz: 20 },

  info: {
    equations: [
      'ẋ = y',
      'ẏ = z',
      'ż = −ax − by − z + cx³',
    ],
    parameters: `a = ${a}, b = ${b}, c = ${c}`,
    notes: 'Initial point (1, 1, 0).',
  },
};

registerMap(arneodoMap);
