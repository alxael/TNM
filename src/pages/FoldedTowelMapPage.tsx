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

  // Store latest values in refs for the click handler
  const renderModeRef = useRef(renderMode);
  const iterationsRef = useRef(iterations);
  const colorRef = useRef(color);
  const lineWidthRef = useRef(lineWidth);
  renderModeRef.current = renderMode;
  iterationsRef.current = iterations;
  colorRef.current = color;
  lineWidthRef.current = lineWidth;

  // Initialize Three.js scene
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const ctx = createScene(container, mapDef.cameraPosition);
    sceneRef.current = ctx;
    addAxisBox(ctx.scene, mapDef.axisBox);

    const pm = new PathManager(ctx.scene, mapDef);
    pathManagerRef.current = pm;

    // Animation loop
    function animate() {
      animFrameRef.current = requestAnimationFrame(animate);
      ctx.controls.update();
      ctx.renderer.render(ctx.scene, ctx.camera);
    }
    animate();

    // Resize handler
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

  // Click to draw path
  const pointerDownPos = useRef({ x: 0, y: 0 });

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    pointerDownPos.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    const dx = Math.abs(e.clientX - pointerDownPos.current.x);
    const dy = Math.abs(e.clientY - pointerDownPos.current.y);
    if (dx > 4 || dy > 4) return; // was a drag

    const ctx = sceneRef.current;
    const container = containerRef.current;
    if (!ctx || !container) return;

    // Convert click to NDC
    const rect = container.getBoundingClientRect();
    const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    // Raycast onto a plane through the origin, facing the camera
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), ctx.camera);
    const plane = new THREE.Plane();
    plane.setFromNormalAndCoplanarPoint(
      ctx.camera.getWorldDirection(new THREE.Vector3()).negate(),
      new THREE.Vector3(0, 0, 0),
    );
    const worldPt = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, worldPt);

    // Un-rotate by the object rotation to get world-space coordinates
    const rot = mapDef.rotation ?? { x: 0, y: 0, z: 0 };
    const invEuler = new THREE.Euler(-rot.x, -rot.y, -rot.z, 'ZYX');
    const unrotated = worldPt.clone().applyEuler(invEuler);

    const initial = mapDef.worldToAttractor(unrotated.x, unrotated.y, unrotated.z);

    setShowHint(false);
    setComputing(true);

    setTimeout(() => {
      const pm = pathManagerRef.current;
      if (pm) {
        pm.drawPath(iterationsRef.current, colorRef.current, renderModeRef.current, initial, lineWidthRef.current);
        setPathCount(pm.count);
        setPaths([...pm.entries]);
      }
      setComputing(false);
    }, 10);
  }, []);

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
