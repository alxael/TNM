export interface MapDefinition {
  id: string;
  label: string;
  description: string;

  /** Fluent UI icon name (without size/style suffix). */
  icon?: string;

  /** Iterate the map and return a Float32Array of [x,y,z,...] positions in world space. */
  generate(iterations: number, x0: number, y0: number, z0: number): Float32Array;

  /** Convert world-space coordinates back to attractor parameter space. */
  worldToAttractor(wx: number, wy: number, wz: number): { x: number; y: number; z: number };

  /** Seed initial conditions for cycling through when no click position is given. */
  initialConditions: Array<{ x: number; y: number; z: number }>;

  /** Euler rotation applied to each path object (radians). Defaults to (0,0,0). */
  rotation?: { x: number; y: number; z: number };

  /** Initial camera position. Defaults to (20, 15, 55). */
  cameraPosition?: { x: number; y: number; z: number };

  /** Half-extents of the axis-guide box. Defaults to (17, 17, 15). */
  axisBox?: { hx: number; hy: number; hz: number };

  /** Content shown in the info panel. */
  info: {
    equations: string[];
    parameters: string;
    lyapunov?: string;
    notes?: string;
  };
}

const registry = new Map<string, MapDefinition>();

export function registerMap(def: MapDefinition): void {
  registry.set(def.id, def);
}

export function getMap(id: string): MapDefinition | undefined {
  return registry.get(id);
}

export function getAllMaps(): MapDefinition[] {
  return Array.from(registry.values());
}
