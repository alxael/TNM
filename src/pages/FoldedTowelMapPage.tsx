import * as THREE from 'three';
import { useRef, useEffect, useState, useCallback } from 'react';
import {
  makeStyles,
  Body1,
  Caption1,
  Spinner,
  tokens,
} from '@fluentui/react-components';
import { createScene, addAxisBox, addRoomEnvironment, handleResize, type SceneContext } from '../lib/sceneSetup';
import { setupVRControls, type VRControls } from '../lib/vrControls';
import { PathManager, type PathEntry } from '../lib/pathManager';
import { TopBar } from '../components/TopBar';
import { SettingsPanel } from '../components/SettingsPanel';
import { PathsPanel } from '../components/PathsPanel';
import { InfoPanel } from '../components/InfoPanel';
import type { MapDefinition } from '../lib/mapDefinition';
import { audioService } from '../lib/audioService';

interface AttractorPageProps {
  mapDef: MapDefinition;
  onMenuClick: () => void;
}

const useStyles = makeStyles({
  root: {
    width: '100%',
    height: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  canvas: {
    width: '100%',
    height: '100%',
    cursor: 'crosshair',
  },
  vrButtonHost: {
    position: 'absolute',
    bottom: '20px',
    right: '20px',
    zIndex: 100,
  },
  hintOverlay: {
    position: 'absolute',
    bottom: '32px',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '5px',
    pointerEvents: 'none',
    transition: 'opacity 0.5s',
    zIndex: 50,
    opacity: 0.35,
  },
  computingOverlay: {
    position: 'absolute',
    bottom: '28px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 200,
    pointerEvents: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusCircular,
    padding: '6px 18px',
  },
});

export function AttractorPage({ mapDef, onMenuClick }: AttractorPageProps) {
  const styles = useStyles();
  const containerRef = useRef<HTMLDivElement>(null);
  const vrButtonRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<SceneContext | null>(null);
  const vrControlsRef = useRef<VRControls | null>(null);
  const pathManagerRef = useRef<PathManager | null>(null);
  const animFrameRef = useRef<number>(0);
  
  // Tracks the active path audio streaming interval loop
  const streamIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const supportedModes = mapDef.supportedModes ?? ['points', 'line'];
  const [renderMode, setRenderMode] = useState<'points' | 'line'>(supportedModes[0]);
  const [iterations, setIterations] = useState(1000);
  const [color, setColor] = useState('#ff6030');
  const [lineWidth, setLineWidth] = useState(3);
  const [soundDuration, setSoundDuration] = useState(1); // seconds
  const [pathCount, setPathCount] = useState(0);
  const [paths, setPaths] = useState<ReadonlyArray<PathEntry>>([]);
  const [showHint, setShowHint] = useState(true);
  const [computing, setComputing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pathsOpen, setPathsOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

  const renderModeRef = useRef(renderMode);
  const iterationsRef = useRef(iterations);
  const colorRef = useRef(color);
  const lineWidthRef = useRef(lineWidth);
  const soundDurationRef = useRef(soundDuration);
  renderModeRef.current = renderMode;
  iterationsRef.current = iterations;
  colorRef.current = color;
  lineWidthRef.current = lineWidth;
  soundDurationRef.current = soundDuration;

  // Manage WebSocket lifecycle and active playback loops safely
  useEffect(() => {
    audioService.connect();
    return () => {
      audioService.disconnect();
      if (streamIntervalRef.current) {
        clearInterval(streamIntervalRef.current);
      }
    };
  }, []);

  // Initialize Three.js scene
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const ctx = createScene(container, mapDef.cameraPosition);
    sceneRef.current = ctx;
    addAxisBox(ctx.scene, mapDef.axisBox);

    const pm = new PathManager(ctx.scene, mapDef);
    pathManagerRef.current = pm;

    // Derive an orbit radius/height from the camera's initial position so each
    // attractor frames itself sensibly in VR without per-system tuning.
    const camPos = mapDef.cameraPosition ?? { x: 20, y: 15, z: 55 };
    const orbitRadius = Math.hypot(camPos.x, camPos.z);
    const orbitHeight = camPos.y;

    // Virtual room — floor grid + subtle wireframe walls sized to enclose the
    // orbit circle so the user has spatial reference while in VR.
    addRoomEnvironment(ctx.scene, {
      attractorHalfExtents: mapDef.axisBox,
      roomRadius: orbitRadius * 1.2,
      roomHeight: orbitHeight + (mapDef.axisBox?.hy ?? 17) + 10,
    });
    const vr = setupVRControls(ctx, {
      radius: orbitRadius,
      height: orbitHeight,
      onSelect: (worldPt) => seedPathRef.current(worldPt),
      onClear: () => handleClearRef.current(),
    });
    vrControlsRef.current = vr;
    if (vrButtonRef.current) vrButtonRef.current.appendChild(vr.button);

    // Use setAnimationLoop so the same loop drives both desktop and XR frames.
    let lastTime = performance.now();
    ctx.renderer.setAnimationLoop(() => {
      const now = performance.now();
      const delta = (now - lastTime) / 1000;
      lastTime = now;
      if (ctx.renderer.xr.isPresenting) {
        vr.update(delta);
      } else {
        ctx.controls.update();
      }
      ctx.renderer.render(ctx.scene, ctx.camera);
    });

    const onResize = () => handleResize(ctx, container);
    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(container);

    return () => {
      ctx.renderer.setAnimationLoop(null);
      cancelAnimationFrame(animFrameRef.current);
      resizeObserver.disconnect();
      vr.dispose();
      vrControlsRef.current = null;
      pm.dispose();
      ctx.renderer.dispose();
      ctx.controls.dispose();
      if (container.contains(ctx.renderer.domElement)) {
        container.removeChild(ctx.renderer.domElement);
      }
    };
  }, []);

  const pointerDownPos = useRef({ x: 0, y: 0 });

  const handleClear = useCallback(() => {
    const pm = pathManagerRef.current;
    if (pm) {
      pm.clearAll();
      setPathCount(0);
      setPaths([]);
    }
  }, []);

  // Core path-seeding routine used by both desktop clicks and VR controller
  // trigger events. Takes a world-space point on the camera-facing plane.
  const seedPathAtWorldPoint = useCallback((worldPt: THREE.Vector3) => {
    const pm = pathManagerRef.current;
    if (!pm) return;

    const rot = mapDef.rotation ?? { x: 0, y: 0, z: 0 };
    const invEuler = new THREE.Euler(-rot.x, -rot.y, -rot.z, 'ZYX');
    const unrotated = worldPt.clone().applyEuler(invEuler);

    const initial = mapDef.worldToAttractor(unrotated.x, unrotated.y, unrotated.z);

    setShowHint(false);
    setComputing(true);

    // Clear any existing audio playback interval before starting a new path trace
    if (streamIntervalRef.current) {
      clearInterval(streamIntervalRef.current);
      streamIntervalRef.current = null;
    }

    const entry = pm.drawPath(
      iterationsRef.current,
      colorRef.current,
      renderModeRef.current,
      initial,
      lineWidthRef.current,
    );

    if (!entry?.positions) {
      setComputing(false);
      return;
    }

    setPathCount(pm.count);
    setPaths([...pm.entries]);
    setComputing(false);

    const points = entry.positions;
    const totalPoints = points.length / 3;
    let currentIndex = 0;

    const { hx = 0, hy = 0, hz = 0 } = mapDef.axisBox ?? {};
    const TARGET_AUDIO_MS = soundDurationRef.current * 1000;
    const TICK_MS = 25;
    const totalTicks = Math.max(1, Math.ceil(TARGET_AUDIO_MS / TICK_MS));
    const stride = Math.max(1, Math.floor(totalPoints / totalTicks));

    streamIntervalRef.current = setInterval(() => {
      if (currentIndex >= totalPoints) {
        if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);
        return;
      }
      const rawX = points[currentIndex * 3];
      const rawY = points[currentIndex * 3 + 1];
      const rawZ = points[currentIndex * 3 + 2];
      const normX = (rawX + hx) / (2 * hx);
      const normY = (rawY + hy) / (2 * hy);
      const normZ = (rawZ + hz) / (2 * hz);
      if (audioService && typeof audioService.sendModulation === 'function') {
        audioService.sendModulation(normX, normY, normZ);
      }
      currentIndex += stride;
    }, TICK_MS);
  }, [mapDef]);

  // Refs so VR callbacks (captured once at session setup) always see the
  // latest seed/clear implementations.
  const seedPathRef = useRef(seedPathAtWorldPoint);
  const handleClearRef = useRef(handleClear);
  seedPathRef.current = seedPathAtWorldPoint;
  handleClearRef.current = handleClear;

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    pointerDownPos.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    const dx = Math.abs(e.clientX - pointerDownPos.current.x);
    const dy = Math.abs(e.clientY - pointerDownPos.current.y);
    if (dx > 4 || dy > 4) return; // ignore drags

    const ctx = sceneRef.current;
    const container = containerRef.current;
    if (!ctx || !container) return;

    const rect = container.getBoundingClientRect();
    const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), ctx.camera);
    const plane = new THREE.Plane();
    plane.setFromNormalAndCoplanarPoint(
      ctx.camera.getWorldDirection(new THREE.Vector3()).negate(),
      new THREE.Vector3(0, 0, 0),
    );
    const worldPt = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, worldPt);

    seedPathAtWorldPoint(worldPt);
  }, [seedPathAtWorldPoint]);

  const handleRemovePath = useCallback((id: number) => {
    const pm = pathManagerRef.current;
    if (pm) {
      pm.removePath(id);
      setPathCount(pm.count);
      setPaths([...pm.entries]);
    }
  }, []);

  return (
    <div className={styles.root}>
      <TopBar
        title={mapDef.label}
        onMenuClick={onMenuClick}
        renderMode={renderMode}
        onRenderModeChange={setRenderMode}
        supportedModes={supportedModes}
        onClear={handleClear}
        onPathsClick={() => setPathsOpen(!pathsOpen)}
        onSettingsClick={() => setSettingsOpen(!settingsOpen)}
        onInfoClick={() => setInfoOpen(!infoOpen)}
        pathCount={pathCount}
      />

      <div
        ref={containerRef}
        className={styles.canvas}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
      />

      <div ref={vrButtonRef} className={styles.vrButtonHost} />

      {showHint && (
        <div className={styles.hintOverlay}>
          <Body1>Click anywhere to plot a path</Body1>
          <Caption1>Drag to rotate · Scroll to zoom · Right-drag to pan</Caption1>
        </div>
      )}

      {computing && (
        <div className={styles.computingOverlay}>
          <Spinner size="tiny" />
          <Caption1>Computing path…</Caption1>
        </div>
      )}

      {settingsOpen && (
        <SettingsPanel
          iterations={iterations}
          onIterationsChange={setIterations}
          color={color}
          onColorChange={setColor}
          lineWidth={lineWidth}
          onLineWidthChange={setLineWidth}
          soundDuration={soundDuration}
          onSoundDurationChange={setSoundDuration}
        />
      )}

      {pathsOpen && (
        <PathsPanel
          paths={paths}
          onRemovePath={handleRemovePath}
        />
      )}

      {infoOpen && <InfoPanel info={mapDef.info} />}
    </div>
  );
}