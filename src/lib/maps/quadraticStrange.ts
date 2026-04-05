import { registerMap, type MapDefinition } from '../mapDefinition';

// Exact values from https://sequelaencollection.home.blog/3d-chaotic-attractors/
// This is a discrete map (not ODE), so no RK4 integration.
const PARAMS = [
  -0.875, -0.173,  0.307, -0.436,  0.598,
   0.003, -0.039,  0.96,  -0.84,   0.885,
   0.774,  0.281, -0.015,  0.585,  0.442,
  -0.18,  -0.535, -0.151, -0.971, -0.48,
   0.777,  0.418,  0.185,  0.006,  0.45,
  -0.066,  0.498,  0.142, -0.246, -0.939,
];

const WARMUP = 500;
const SCALE = 10;

function quadraticStep(
  a: number[], x: number, y: number, z: number, offset: number,
): number {
  return (
    a[offset]     + a[offset + 1] * x + a[offset + 2] * y + a[offset + 3] * z +
    a[offset + 4] * x * y + a[offset + 5] * x * z + a[offset + 6] * y * z +
    a[offset + 7] * x * x + a[offset + 8] * y * y + a[offset + 9] * z * z
  );
}

function generate(
  iterations: number,
  x0: number,
  y0: number,
  z0: number,
): Float32Array {
  const buf = new Float32Array(iterations * 3);
  let x = x0, y = y0, z = z0;

  for (let i = 0; i < WARMUP; i++) {
    const nx = quadraticStep(PARAMS, x, y, z, 0);
    const ny = quadraticStep(PARAMS, x, y, z, 10);
    const nz = quadraticStep(PARAMS, x, y, z, 20);
    x = nx; y = ny; z = nz;
    if (!isFinite(x) || !isFinite(y) || !isFinite(z)) return buf.subarray(0, 0);
  }

  let count = 0;
  for (let i = 0; i < iterations; i++) {
    const nx = quadraticStep(PARAMS, x, y, z, 0);
    const ny = quadraticStep(PARAMS, x, y, z, 10);
    const nz = quadraticStep(PARAMS, x, y, z, 20);
    x = nx; y = ny; z = nz;
    if (!isFinite(x) || !isFinite(y) || !isFinite(z)) break;

    buf[count * 3]     = x * SCALE;
    buf[count * 3 + 1] = y * SCALE;
    buf[count * 3 + 2] = z * SCALE;
    count++;
  }

  return buf.subarray(0, count * 3);
}

export const quadraticStrangeMap: MapDefinition = {
  id: 'quadratic-strange',
  label: '3D Quadratic Strange Attractor',
  description: 'Sprott · 30-parameter discrete quadratic map',
  icon: 'Cube',

  generate,

  worldToAttractor: (wx, wy, wz) => ({ x: wx / SCALE, y: wy / SCALE, z: wz / SCALE }),

  initialConditions: [
    { x: 0.1, y: 0, z: 0 },
    { x: 0, y: 0.1, z: 0 },
    { x: 0, y: 0, z: 0.1 },
    { x: 0.1, y: 0.1, z: 0.1 },
  ],

  cameraPosition: { x: 20, y: 15, z: 40 },
  axisBox: { hx: 15, hy: 15, hz: 15 },

  info: {
    equations: [
      'xₙ₊₁ = a₀ + a₁x + a₂y + a₃z + a₄xy + a₅xz + a₆yz + a₇x² + a₈y² + a₉z²',
      'yₙ₊₁ = a₁₀ + … (same form, a₁₀–a₁₉)',
      'zₙ₊₁ = a₂₀ + … (same form, a₂₀–a₂₉)',
    ],
    parameters: PARAMS.map((v, i) => `a${i}=${v}`).join(', '),
    notes: 'Discrete quadratic map (not ODE). 30 parameters based on Sprott.',
  },
};

registerMap(quadraticStrangeMap);
