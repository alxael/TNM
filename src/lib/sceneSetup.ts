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
  const mat = new THREE.LineBasicMaterial({ color: 0x222244, transparent: true, opacity: 0 });
  const box = new THREE.LineSegments(edges, mat);
  scene.add(box);
}

export function handleResize(ctx: SceneContext, container: HTMLElement): void {
  ctx.camera.aspect = container.clientWidth / container.clientHeight;
  ctx.camera.updateProjectionMatrix();
  ctx.renderer.setSize(container.clientWidth, container.clientHeight);
}
