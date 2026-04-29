/**
 * Shared RK4 integrator + generate function for 3D ODE-based attractors.
 */

export type Derivs3D = (x: number, y: number, z: number) => [number, number, number];

export interface OdeGenerateOpts {
  derivs: Derivs3D;
  dt: number;
  warmup: number;
  scale?: number;
  center?: { x: number; y: number; z: number };
}

export function odeGenerate(
  opts: OdeGenerateOpts,
  iterations: number,
  x0: number,
  y0: number,
  z0: number,
): Float32Array {
  const { derivs, dt, warmup, scale = 1, center = { x: 0, y: 0, z: 0 } } = opts;
  const buf = new Float32Array(iterations * 3);

  let x = x0, y = y0, z = z0;

  function rk4() {
    const [dx1, dy1, dz1] = derivs(x, y, z);
    const [dx2, dy2, dz2] = derivs(x + 0.5 * dt * dx1, y + 0.5 * dt * dy1, z + 0.5 * dt * dz1);
    const [dx3, dy3, dz3] = derivs(x + 0.5 * dt * dx2, y + 0.5 * dt * dy2, z + 0.5 * dt * dz2);
    const [dx4, dy4, dz4] = derivs(x + dt * dx3, y + dt * dy3, z + dt * dz3);
    x += (dt / 6) * (dx1 + 2 * dx2 + 2 * dx3 + dx4);
    y += (dt / 6) * (dy1 + 2 * dy2 + 2 * dy3 + dy4);
    z += (dt / 6) * (dz1 + 2 * dz2 + 2 * dz3 + dz4);
  }

  for (let i = 0; i < warmup; i++) {
    rk4();
    if (!isFinite(x) || !isFinite(y) || !isFinite(z)) return buf.subarray(0, 0);
  }

  let count = 0;
  for (let i = 0; i < iterations; i++) {
    rk4();
    if (!isFinite(x) || !isFinite(y) || !isFinite(z)) break;
    buf[count * 3]     = (x - center.x) * scale;
    buf[count * 3 + 1] = (y - center.y) * scale;
    buf[count * 3 + 2] = (z - center.z) * scale;
    count++;
  }

  return buf.subarray(0, count * 3);
}
