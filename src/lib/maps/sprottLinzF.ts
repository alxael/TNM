import { registerMap, type MapDefinition } from '../mapDefinition';
import { odeGenerate } from '../odeHelper';

// Exact values from https://sequelaencollection.home.blog/3d-chaotic-attractors/
const a = 0.5;
const DT = 0.01;
const WARMUP = 2000;
const SCALE = 5;

const opts = {
  derivs: (x: number, y: number, z: number): [number, number, number] => [
    y + z,
    -x + a * y,
    x * x - z,
  ],
  dt: DT,
  warmup: WARMUP,
  scale: SCALE,
};

export const sprottLinzFMap: MapDefinition = {
  id: 'sprott-linz-f',
  label: 'Sprott-Linz F Attractor',
  description: 'Sprott & Linz · 1-parameter · one equilibrium',
  icon: 'Star',

  generate: (iterations, x0, y0, z0) => odeGenerate(opts, iterations, x0, y0, z0),

  worldToAttractor: (wx, wy, wz) => ({ x: wx / SCALE, y: wy / SCALE, z: wz / SCALE }),

  initialConditions: [
    { x: 0.1, y: 0, z: 0 },
    { x: 0.1, y: 0.1, z: 0 },
    { x: 0, y: 0, z: 0.1 },
    { x: -0.1, y: 0.1, z: 0 },
  ],

  cameraPosition: { x: 20, y: 15, z: 45 },
  axisBox: { hx: 20, hy: 20, hz: 20 },

  info: {
    equations: [
      'ẋ = y + z',
      'ẏ = −x + ay',
      'ż = x² − z',
    ],
    parameters: `a = ${a}`,
    notes: 'Initial point (0.1, 0, 0). One equilibrium for any value of a.',
  },
};

registerMap(sprottLinzFMap);
