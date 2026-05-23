import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export interface SceneContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
}

export function createScene(
  container: HTMLElement,
  cameraPos?: { x: number; y: number; z: number },
): SceneContext {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x06060e);

  const pos = cameraPos ?? { x: 20, y: 15, z: 55 };
  const camera = new THREE.PerspectiveCamera(
    60,
    container.clientWidth / container.clientHeight,
    0.1,
    2000
  );
  camera.position.set(pos.x, pos.y, pos.z);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.xr.enabled = true;
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.mouseButtons = {
    LEFT: THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.PAN,
  };

  return { scene, camera, renderer, controls };
}

export function addAxisBox(
  scene: THREE.Scene,
  halfExtents?: { hx: number; hy: number; hz: number },
): void {
  const { hx: hw, hy, hz } = halfExtents ?? { hx: 17, hy: 17, hz: 15 };
  const boxGeo = new THREE.BoxGeometry(hw * 2, hy * 2, hz * 2);
  const edges = new THREE.EdgesGeometry(boxGeo);
  const mat = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.25,
  });
  const box = new THREE.LineSegments(edges, mat);
  scene.add(box);
}

export interface RoomEnvironmentOptions {
  /** Half-extents of the attractor, used to position the floor below it. */
  attractorHalfExtents?: { hx: number; hy: number; hz: number };
  /** Distance from the scene center to each wall. */
  roomRadius?: number;
  /** Height of the walls above the floor. */
  roomHeight?: number;
  /** Number of grid divisions per side of the floor. */
  gridDivisions?: number;
}

/**
 * Adds a subtle virtual room: a grid floor below the attractor and four
 * wireframe walls around it. Gives spatial reference when viewing in VR.
 */
export function addRoomEnvironment(
  scene: THREE.Scene,
  options: RoomEnvironmentOptions = {},
): void {
  const { hy = 17 } = options.attractorHalfExtents ?? {};
  const roomRadius = options.roomRadius ?? 60;
  const roomHeight = options.roomHeight ?? 50;
  const gridDivisions = options.gridDivisions ?? 20;

  const floorY = -hy - 2;
  const floorSize = roomRadius * 2;

  // Floor grid.
  const grid = new THREE.GridHelper(floorSize, gridDivisions, 0x888888, 0x444466);
  grid.position.y = floorY;
  const gridMat = grid.material as THREE.LineBasicMaterial;
  gridMat.transparent = true;
  gridMat.opacity = 0.35;
  scene.add(grid);

  // Wireframe walls — a single box with only its vertical edges drawn at low
  // opacity, so the user perceives an enclosing space without visual clutter.
  const wallsGeo = new THREE.BoxGeometry(floorSize, roomHeight, floorSize);
  const wallsEdges = new THREE.EdgesGeometry(wallsGeo);
  const wallsMat = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.12,
  });
  const walls = new THREE.LineSegments(wallsEdges, wallsMat);
  walls.position.y = floorY + roomHeight / 2;
  scene.add(walls);
}

export function handleResize(ctx: SceneContext, container: HTMLElement): void {
  ctx.camera.aspect = container.clientWidth / container.clientHeight;
  ctx.camera.updateProjectionMatrix();
  ctx.renderer.setSize(container.clientWidth, container.clientHeight);
}
