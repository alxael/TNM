import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import './style.css';

// ─── Scene, Camera, Renderer ──────────────────────────────────────────────────

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x06060e);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  2000
);
camera.position.set(20, 15, 55);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// ─── OrbitControls ────────────────────────────────────────────────────────────

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.mouseButtons = {
  LEFT: THREE.MOUSE.ROTATE,
  MIDDLE: THREE.MOUSE.DOLLY,
  RIGHT: THREE.MOUSE.PAN,
};

// ─── Folded-Towel Map ─────────────────────────────────────────────────────────

const A = 3.8;
const B = 0.2;

const SX = 40;
const SY = 440;   
const SZ = 40;

const CX = 0.5397;
const CY = 0.0051;
const CZ = 0.5678;

function generateFoldedTowel(
  iterations: number,
  x0: number,
  y0: number,
  z0: number
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

// ─── Path Management ──────────────────────────────────────────────────────────

interface PathEntry {
  id: number;
  obj: THREE.Points | THREE.Line;
  color: string;
  iterations: number;
  mode: 'points' | 'line';
}

let pathIdCounter = 0;
const paths: PathEntry[] = [];
let seedCounter = 0;

function drawPath(iterations: number, color: string, mode: 'points' | 'line'): PathEntry | null {
  const ic = [
    { x: 0.50, y:  0.10, z: 0.40 },
    { x: 0.30, y: -0.02, z: 0.60 },
    { x: 0.70, y:  0.03, z: 0.25 },
    { x: 0.20, y: -0.01, z: 0.75 },
    { x: 0.85, y:  0.00, z: 0.50 },
    { x: 0.45, y:  0.02, z: 0.80 },
    { x: 0.60, y: -0.03, z: 0.30 },
    { x: 0.15, y:  0.01, z: 0.55 },
  ];
  const { x: x0, y: y0, z: z0 } = ic[seedCounter % ic.length];
  const jitter = 1e-4;
  seedCounter++;

  const positions = generateFoldedTowel(
    iterations,
    x0 + (Math.random() - 0.5) * jitter,
    y0 + (Math.random() - 0.5) * jitter,
    z0 + (Math.random() - 0.5) * jitter
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

  let obj: THREE.Points | THREE.Line;

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
    const mat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
    });
    obj = new THREE.Line(geo, mat);
  }

  // AICI ESTE MODIFICAREA: Rotim obiectul cu 90 de grade spre stânga (pe axa Z)
  obj.rotation.z = Math.PI / 2;

  scene.add(obj);

  const entry: PathEntry = { id: pathIdCounter++, obj, color, iterations, mode };
  paths.push(entry);
  updatePathCount();
  return entry;
}

function removePath(id: number): void {
  const idx = paths.findIndex(p => p.id === id);
  if (idx === -1) return;
  const [entry] = paths.splice(idx, 1);
  scene.remove(entry.obj);
  entry.obj.geometry.dispose();
  (entry.obj.material as THREE.Material).dispose();
  updatePathCount();
}

function clearAllPaths(): void {
  [...paths].forEach(p => removePath(p.id));
  seedCounter = 0;
}

function updatePathCount() {
  const badge = document.getElementById('path-count') as HTMLElement;
  badge.textContent = paths.length > 0 ? String(paths.length) : '';
  badge.style.display = paths.length > 0 ? 'inline-flex' : 'none';
}

// ─── Axis Helper ──────────────────────────────────────────────────────────────

function addAxisBox() {
  const hw = 17, hy = 17, hz = 15; 
  const boxGeo = new THREE.BoxGeometry(hw * 2, hy * 2, hz * 2);
  const edges = new THREE.EdgesGeometry(boxGeo);
  const mat = new THREE.LineBasicMaterial({ color: 0x222244, transparent: true, opacity: 0.4 });
  const box = new THREE.LineSegments(edges, mat);
  scene.add(box);
}
addAxisBox();

// ─── UI: Render Mode ──────────────────────────────────────────────────────────

let renderMode: 'points' | 'line' = 'points';

document.getElementById('mode-points')?.addEventListener('click', () => {
  renderMode = 'points';
  document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('mode-points')?.classList.add('active');
});
document.getElementById('mode-line')?.addEventListener('click', () => {
  renderMode = 'line';
  document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('mode-line')?.classList.add('active');
});

// ─── UI: Settings ─────────────────────────────────────────────────────────────

let settingsIterations = 20000;
let settingsColor = '#ff6030';

const settingsModal = document.getElementById('settings-modal') as HTMLElement;
const settingsBtn   = document.getElementById('settings-btn')   as HTMLButtonElement;
const iterInput     = document.getElementById('iter-input')     as HTMLInputElement;
const colorInput    = document.getElementById('color-input')    as HTMLInputElement;
const iterDisplay   = document.getElementById('iter-display')   as HTMLElement;

settingsBtn.addEventListener('click', () => {
  settingsModal.classList.toggle('hidden');
  pathsModal.classList.add('hidden');
});
iterInput.addEventListener('input', () => {
  const v = parseInt(iterInput.value, 10);
  if (!isNaN(v)) {
    settingsIterations = v;
    iterDisplay.textContent = v.toLocaleString();
  }
});
colorInput.addEventListener('input', () => { settingsColor = colorInput.value; });

// ─── UI: Paths Modal ──────────────────────────────────────────────────────────

const pathsModal = document.getElementById('paths-modal') as HTMLElement;
const pathsBtn   = document.getElementById('paths-btn')   as HTMLButtonElement;
const pathsTbody = document.getElementById('paths-tbody') as HTMLTableSectionElement;

function refreshPathsTable() {
  pathsTbody.innerHTML = '';
  if (paths.length === 0) {
    pathsTbody.innerHTML = `<tr><td colspan="4" class="empty-row">No paths — click the canvas</td></tr>`;
    return;
  }
  paths.forEach(p => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${p.id}</td>
      <td><span class="color-dot" style="background:${p.color}"></span></td>
      <td>${p.iterations.toLocaleString()}</td>
      <td><button class="del-btn" data-id="${p.id}">✕</button></td>
    `;
    pathsTbody.appendChild(tr);
  });
  pathsTbody.querySelectorAll<HTMLButtonElement>('.del-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      removePath(Number(btn.dataset.id));
      refreshPathsTable();
    });
  });
}

pathsBtn.addEventListener('click', () => {
  pathsModal.classList.toggle('hidden');
  settingsModal.classList.add('hidden');
  refreshPathsTable();
});

// ─── UI: Sidenav ──────────────────────────────────────────────────────────────

const sidenav  = document.getElementById('sidenav')    as HTMLElement;
const menuBtn  = document.getElementById('menu-btn')   as HTMLButtonElement;
const closeBtn = document.getElementById('close-nav')  as HTMLButtonElement;

menuBtn.addEventListener('click',  () => sidenav.classList.toggle('open'));
closeBtn.addEventListener('click', () => sidenav.classList.remove('open'));

document.getElementById('clear-btn')?.addEventListener('click', () => {
  clearAllPaths();
  if (!pathsModal.classList.contains('hidden')) refreshPathsTable();
});

// ─── Click → Draw Path ────────────────────────────────────────────────────────

let pointerDownPos = { x: 0, y: 0 };

renderer.domElement.addEventListener('pointerdown', e => {
  pointerDownPos = { x: e.clientX, y: e.clientY };
});

renderer.domElement.addEventListener('pointerup', e => {
  const wasDrag =
    Math.abs(e.clientX - pointerDownPos.x) > 4 ||
    Math.abs(e.clientY - pointerDownPos.y) > 4;

  if (!wasDrag) {
    document.getElementById('click-hint')?.classList.add('hidden');

    const hint = document.getElementById('loading-hint') as HTMLElement;
    hint.classList.remove('hidden');

    setTimeout(() => {
      drawPath(settingsIterations, settingsColor, renderMode);
      hint.classList.add('hidden');
      if (!pathsModal.classList.contains('hidden')) refreshPathsTable();
    }, 10);
  }
});

// ─── Resize ───────────────────────────────────────────────────────────────────

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ─── Render Loop ──────────────────────────────────────────────────────────────

function animate(): void {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

animate();