import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import type { MapDefinition } from './mapDefinition';

export interface PathEntry {
  id: number;
  obj: THREE.Points | Line2;
  color: string;
  iterations: number;
  mode: 'points' | 'line';
}

export class PathManager {
  private paths: PathEntry[] = [];
  private idCounter = 0;
  private seedCounter = 0;
  private scene: THREE.Scene;
  private mapDef: MapDefinition;

  constructor(scene: THREE.Scene, mapDef: MapDefinition) {
    this.scene = scene;
    this.mapDef = mapDef;
  }

  get entries(): ReadonlyArray<PathEntry> {
    return this.paths;
  }

  get count(): number {
    return this.paths.length;
  }

  drawPath(
    iterations: number,
    color: string,
    mode: 'points' | 'line',
    initial?: { x: number; y: number; z: number },
    lineWidth?: number,
  ): PathEntry | null {
    let x0: number, y0: number, z0: number;
    const jitter = 1e-4;

    if (initial) {
      x0 = initial.x;
      y0 = initial.y;
      z0 = initial.z;
    } else {
      const ic = this.mapDef.initialConditions;
      const seed = ic[this.seedCounter % ic.length];
      x0 = seed.x;
      y0 = seed.y;
      z0 = seed.z;
      this.seedCounter++;
    }

    const positions = this.mapDef.generate(
      iterations,
      x0 + (Math.random() - 0.5) * jitter,
      y0 + (Math.random() - 0.5) * jitter,
      z0 + (Math.random() - 0.5) * jitter,
    );

    if (positions.length < 6) return null;

    const n = positions.length / 3;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const colorsBuf = new Float32Array(n * 3);
    const base = new THREE.Color(color);
    const hsl = { h: 0, s: 0, l: 0 };
    base.getHSL(hsl);
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const c = new THREE.Color().setHSL(
        (hsl.h + (t - 0.5) * 0.15 + 1) % 1,
        Math.min(1, hsl.s + 0.1),
        Math.min(0.85, 0.35 + t * 0.45)
      );
      colorsBuf[i * 3]     = c.r;
      colorsBuf[i * 3 + 1] = c.g;
      colorsBuf[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colorsBuf, 3));

    let obj: THREE.Points | Line2;

    if (mode === 'points') {
      const mat = new THREE.PointsMaterial({
        size: 0.12,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        sizeAttenuation: true,
      });
      obj = new THREE.Points(geo, mat);
    } else {
      const lineGeo = new LineGeometry();
      lineGeo.setPositions(Array.from(positions));
      lineGeo.setColors(Array.from(colorsBuf));
      const mat = new LineMaterial({
        linewidth: lineWidth ?? 2,
        vertexColors: true,
        transparent: true,
        opacity: 0.75,
        worldUnits: false,
      });
      mat.resolution.set(window.innerWidth, window.innerHeight);
      obj = new Line2(lineGeo, mat);
      obj.computeLineDistances();
    }

    const rot = this.mapDef.rotation ?? { x: 0, y: 0, z: 0 };
    obj.rotation.set(rot.x, rot.y, rot.z);
    this.scene.add(obj);

    const entry: PathEntry = { id: this.idCounter++, obj, color, iterations, mode };
    this.paths.push(entry);
    return entry;
  }

  removePath(id: number): void {
    const idx = this.paths.findIndex(p => p.id === id);
    if (idx === -1) return;
    const [entry] = this.paths.splice(idx, 1);
    this.scene.remove(entry.obj);
    entry.obj.geometry.dispose();
    (entry.obj.material as THREE.Material).dispose();
  }

  clearAll(): void {
    [...this.paths].forEach(p => this.removePath(p.id));
    this.seedCounter = 0;
  }

  dispose(): void {
    this.clearAll();
  }
}
