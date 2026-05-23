import * as THREE from 'three';
import { useRef, useEffect, useState, useCallback } from 'react';
import {
  makeStyles,
  Body1,
  Caption1,
  Spinner,
  tokens,
} from '@fluentui/react-components';
import { createScene, addAxisBox, handleResize, type SceneContext } from '../lib/sceneSetup';
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
  const sceneRef = useRef<SceneContext | null>(null);
  const pathManagerRef = useRef<PathManager | null>(null);
  const animFrameRef = useRef<number>(0);
  
  // Tracks the active path audio streaming interval loop
  const streamIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const supportedModes = mapDef.supportedModes ?? ['points', 'line'];
  const [renderMode, setRenderMode] = useState<'points' | 'line'>(supportedModes[0]);
  const [iterations, setIterations] = useState(1000);
  const [color, setColor] = useState('#ff6030');
  const [lineWidth, setLineWidth] = useState(3);
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
  renderModeRef.current = renderMode;
  iterationsRef.current = iterations;
  colorRef.current = color;
  lineWidthRef.current = lineWidth;

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

    function animate() {
      animFrameRef.current = requestAnimationFrame(animate);
      ctx.controls.update();
      ctx.renderer.render(ctx.scene, ctx.camera);
    }
    animate();

    const onResize = () => handleResize(ctx, container);
    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      resizeObserver.disconnect();
      pm.dispose();
      ctx.renderer.dispose();
      ctx.controls.dispose();
      if (container.contains(ctx.renderer.domElement)) {
        container.removeChild(ctx.renderer.domElement);
      }
    };
  }, []);

  const pointerDownPos = useRef({ x: 0, y: 0 });

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    pointerDownPos.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    const dx = Math.abs(e.clientX - pointerDownPos.current.x);
    // FIXED TYPO: Corrected pointer down reference matching from clientX to clientY
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

    const pm = pathManagerRef.current;
    if (pm) {
      // Draw the path instantly to calculate its positions array
      const entry = pm.drawPath(
        iterationsRef.current,
        colorRef.current,
        renderModeRef.current,
        initial,
        lineWidthRef.current
      );

      if (entry && entry.positions) {
        setPathCount(pm.count);
        setPaths([...pm.entries]);

        const points = entry.positions; // Flat Float32Array structured as [x0, y0, z0, x1, y1, z1...]
        const totalPoints = points.length / 3;
        let currentIndex = 0;

        // Pull the map definition's operational bounding extents for scaling
        const { hx = 0, hy = 0, hz = 0 } = mapDef.axisBox ?? {};

        // Begin tracing and streaming the coordinates sequentially
        streamIntervalRef.current = setInterval(() => {
          if (currentIndex >= totalPoints) {
            if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);
            setComputing(false);
            return;
          }

          // Extract the point parameters
          const rawX = points[currentIndex * 3];
          const rawY = points[currentIndex * 3 + 1];
          const rawZ = points[currentIndex * 3 + 2];

          // DYNAMIC NORMALIZATION: Translate raw values into standard 0.0 -> 1.0 spaces
          // Maps coordinate ranges from [-extent, +extent] safely onto [0.0, 1.0]
          const normX = (rawX + hx) / (2 * hx);
          const normY = (rawY + hy) / (2 * hy);
          const normZ = (rawZ + hz) / (2 * hz);

          // Stream the data safely over the websocket connection bridge
          if (audioService && typeof audioService.sendModulation === 'function') {
            audioService.sendModulation(normX, normY, normZ);
          }

          currentIndex++;
        }, 25); // Fires ~40 updates per second for fluid sound modulation mapping
      } else {
        setComputing(false);
      }
    } else {
      setComputing(false);
    }
  }, [mapDef]);

  const handleClear = useCallback(() => {
    const pm = pathManagerRef.current;
    if (pm) {
      pm.clearAll();
      setPathCount(0);
      setPaths([]);
    }
  }, []);

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