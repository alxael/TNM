import { registerMap, type MapDefinition } from './mapDefinition';

const A = 3.8;
const B = 0.2;

const SX = 40;
const SY = 440;
const SZ = 40;

const CX = 0.5397;
const CY = 0.0051;
const CZ = 0.5678;

function generate(
  iterations: number,
  x0: number,
  y0: number,
  z0: number,
): Float32Array {
  const buf = new Float32Array(iterations * 3);
  let x = x0, y = y0, z = z0;

  for (let i = 0; i < 1000; i++) {
    const nx = A * x * (1 - x) - 0.05 * (y + 0.35) * (1 - 2 * z);
    const ny = 0.1 * ((y + 0.35) * (1 + 2 * z) - 1) * (1 - 1.9 * x);
    const nz = 3.78 * z * (1 - z) + B * y;
    x = nx; y = ny; z = nz;
    if (!isFinite(x) || !isFinite(y) || !isFinite(z)) return buf.subarray(0, 0);
  }

  let count = 0;
  for (let i = 0; i < iterations; i++) {
    const nx = A * x * (1 - x) - 0.05 * (y + 0.35) * (1 - 2 * z);
    const ny = 0.1 * ((y + 0.35) * (1 + 2 * z) - 1) * (1 - 1.9 * x);
    const nz = 3.78 * z * (1 - z) + B * y;
    x = nx; y = ny; z = nz;
    if (!isFinite(x) || !isFinite(y) || !isFinite(z)) break;

    buf[count * 3]     = (x - CX) * SX;
    buf[count * 3 + 1] = (y - CY) * SY;
    buf[count * 3 + 2] = (z - CZ) * SZ;
    count++;
  }

  return buf.subarray(0, count * 3);
}

export const foldedTowelMap: MapDefinition = {
  id: 'folded-towel',
  label: 'Folded-Towel Map',
  description: 'Rössler 1979 · hyperchaotic · 3D attractor',
  icon: 'LeafThree',

  generate,

  worldToAttractor(wx, wy, wz) {
    return {
      x: wx / SX + CX,
      y: wy / SY + CY,
      z: wz / SZ + CZ,
    };
  },

  initialConditions: [
    { x: 0.50, y:  0.10, z: 0.40 },
    { x: 0.30, y: -0.02, z: 0.60 },
    { x: 0.70, y:  0.03, z: 0.25 },
    { x: 0.20, y: -0.01, z: 0.75 },
    { x: 0.85, y:  0.00, z: 0.50 },
    { x: 0.45, y:  0.02, z: 0.80 },
    { x: 0.60, y: -0.03, z: 0.30 },
    { x: 0.15, y:  0.01, z: 0.55 },
  ],

  rotation: { x: 0, y: 0, z: Math.PI / 2 },
  cameraPosition: { x: 20, y: 15, z: 55 },
  axisBox: { hx: 17, hy: 17, hz: 15 },

  info: {
    equations: [
      "x′ = a·x(1−x) − 0.05(y+0.35)(1−2z)",
      "y′ = 0.1((y+0.35)(1+2z)−1)(1−1.9x)",
      "z′ = 3.78·z(1−z) + b·y",
    ],
    parameters: 'a = 3.8 · b = 0.2',
    lyapunov: 'λ₁=0.430  λ₂=0.377  λ₃=−3.299',
    notes: 'The attractor is a thin folded sheet: y-axis is ~11× thinner than x/z. Scaled non-uniformly so the 3D structure is visible.',
  },
};

registerMap(foldedTowelMap);
