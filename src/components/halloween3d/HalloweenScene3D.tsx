'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { HalloweenDrawingSession, DrawingUser } from './drawingEngine';
import { halloweenAudio } from './halloweenAudio';
import confetti from 'canvas-confetti';

interface HalloweenScene3DProps {
  currentDrawing: DrawingUser | null;
  drawingProgress: number; // 0 to 1
  onDrawingCompleted?: (user: DrawingUser) => void;
  cameraMode: 'cinematic' | 'stream' | 'topdown' | 'free';
  particleBurstCount: number;
}

// Mesh names in graphtec_fcx2000.glb for moving parts
const GANTRY_NAMES = new Set(['Object_2', 'Object_12', 'Object_23']);
const HEAD_NAMES = new Set([
  'Object_13', 'Object_14', 'Object_15', 'Object_16', 'Object_24',
  'Object_35', 'Object_36', 'Object_38', 'Object_39', 'Object_40',
  'Object_41', 'Object_42', 'Object_43', 'Object_44', 'Object_45',
  'Object_46', 'Object_47'
]);
const PEN_NAMES = new Set(['Object_48', 'Object_49', 'Object_50', 'Object_51']);

export const HalloweenScene3D: React.FC<HalloweenScene3DProps> = ({
  currentDrawing,
  drawingProgress,
  onDrawingCompleted,
  cameraMode,
  particleBurstCount,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sessionRef = useRef<HalloweenDrawingSession | null>(null);
  const textureRef = useRef<THREE.CanvasTexture | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);

  // Plotter Machine Procedural Refs
  const plotterGroupRef = useRef<THREE.Group | null>(null);
  const gantryBeamRef = useRef<THREE.Group | null>(null);
  const toolCarriageRef = useRef<THREE.Group | null>(null);
  const penTipLightRef = useRef<THREE.PointLight | null>(null);
  const penMeshRef = useRef<THREE.Group | null>(null);
  const laserCrosshairRef = useRef<THREE.Mesh | null>(null);

  // Actual GLB Animated Meshes Refs
  const glbGantryMeshesRef = useRef<THREE.Mesh[]>([]);
  const glbHeadMeshesRef = useRef<THREE.Mesh[]>([]);
  const glbPenMeshesRef = useRef<THREE.Mesh[]>([]);
  const glbScaleFactorRef = useRef<number>(0.01825);
  const isGlbLoadedRef = useRef<boolean>(false);

  const pumpkinsLightRef = useRef<THREE.PointLight[]>([]);
  const batsRef = useRef<{ mesh: THREE.Group; speed: number; radius: number; angle: number; y: number }[]>([]);
  const sparkGeoRef = useRef<THREE.BufferGeometry | null>(null);
  const sparkPositionsRef = useRef<Float32Array | null>(null);

  // Confetti trigger ref
  const lastBurstRef = useRef<number>(0);
  const hasTriggeredFanfareRef = useRef<boolean>(false);

  // Dimensions of drawing sheet on the plotter bed
  const paperWidth = 2.0;
  const paperHeight = 1.6;
  const bedHeight = 1.03; // Surface height of Graphtec FCX2000 table

  // Initialize or update drawing session when currentDrawing changes
  useEffect(() => {
    if (!currentDrawing) {
      sessionRef.current = null;
      hasTriggeredFanfareRef.current = false;
      return;
    }

    const session = new HalloweenDrawingSession(currentDrawing);
    sessionRef.current = session;
    hasTriggeredFanfareRef.current = false;

    // Sonidos temáticos limpios (sin ruido blanco)
    if (currentDrawing.diamonds >= 500) {
      halloweenAudio.playThunder();
      setTimeout(() => halloweenAudio.playWitchLaugh(), 400);
    } else if (currentDrawing.diamonds >= 100) {
      halloweenAudio.playSpookyChime(1.2);
    } else {
      halloweenAudio.playSpookyChime(1.0);
    }

    if (textureRef.current) {
      textureRef.current.image = session.canvas;
      textureRef.current.needsUpdate = true;
    }
  }, [currentDrawing]);

  // Burst confetti if particleBurstCount increments
  useEffect(() => {
    if (particleBurstCount > lastBurstRef.current) {
      lastBurstRef.current = particleBurstCount;
      try {
        confetti({
          particleCount: 90,
          spread: 80,
          origin: { y: 0.5 },
          colors: ['#f97316', '#a855f7', '#fbbf24', '#10b981', '#38bdf8'],
        });
      } catch {}
    }
  }, [particleBurstCount]);

  // Three.js Scene Setup with Graphtec FCX2000 Plotter
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x06030c);
    scene.fog = new THREE.FogExp2(0x0a0614, 0.035);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    cameraRef.current = camera;
    camera.position.set(0, 2.5, 3.4);

    // 2. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    container.replaceChildren(renderer.domElement);

    // 3. Spooky Workshop & Halloween Lighting
    const ambientLight = new THREE.AmbientLight(0x1e1538, 1.4);
    scene.add(ambientLight);

    // Moonlight
    const moonLight = new THREE.DirectionalLight(0xb0c4de, 1.6);
    moonLight.position.set(-6, 12, 5);
    moonLight.castShadow = true;
    moonLight.shadow.mapSize.width = 1024;
    moonLight.shadow.mapSize.height = 1024;
    moonLight.shadow.bias = -0.001;
    scene.add(moonLight);

    // Machine Work Overhead SpotLight (ilumina la mesa del plotter con luz blanca de precisión)
    const plotterSpot = new THREE.SpotLight(0xfff5e6, 3.5, 9, Math.PI / 4, 0.35, 1.0);
    plotterSpot.position.set(0, 4.0, 0.3);
    plotterSpot.target.position.set(0, bedHeight, 0);
    plotterSpot.castShadow = true;
    scene.add(plotterSpot);
    scene.add(plotterSpot.target);

    // Jack-o'-lantern Point Lights
    const pLight1 = new THREE.PointLight(0xf97316, 3.5, 7);
    pLight1.position.set(-2.6, 0.45, 0.8);
    scene.add(pLight1);

    const pLight2 = new THREE.PointLight(0xa855f7, 3.2, 7);
    pLight2.position.set(2.6, 0.45, 0.8);
    scene.add(pLight2);

    pumpkinsLightRef.current = [pLight1, pLight2];

    // 4. Floor: Dark industrial stone slab with glowing calibration grid
    const floorGeo = new THREE.PlaneGeometry(30, 30, 32, 32);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0c0816,
      roughness: 0.85,
      metalness: 0.15,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Floor Glowing Tech Rune Circle around Plotter
    const runeRingGeo = new THREE.RingGeometry(2.2, 3.2, 48);
    const runeRingMat = new THREE.MeshBasicMaterial({
      color: 0x8b5cf6,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.3,
    });
    const runeRing = new THREE.Mesh(runeRingGeo, runeRingMat);
    runeRing.rotation.x = -Math.PI / 2;
    runeRing.position.y = 0.01;
    scene.add(runeRing);

    // 5. Giant Harvest Moon in the background
    const moonGeo = new THREE.SphereGeometry(3.5, 32, 32);
    const moonMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    const moon = new THREE.Mesh(moonGeo, moonMat);
    moon.position.set(-9, 14, -20);
    scene.add(moon);

    // Moon Glow Halo
    const moonGlowGeo = new THREE.RingGeometry(3.5, 6.5, 32);
    const moonGlowMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.16,
      side: THREE.DoubleSide,
    });
    const moonGlow = new THREE.Mesh(moonGlowGeo, moonGlowMat);
    moonGlow.position.copy(moon.position);
    moonGlow.position.z += 0.1;
    scene.add(moonGlow);

    // 6. 3D Jack-o'-Lanterns (Calabazas Talladas)
    function createPumpkin(x: number, y: number, z: number, scale: number, glowColor: number) {
      const pumpkinGroup = new THREE.Group();
      const bodyGeo = new THREE.SphereGeometry(0.55 * scale, 16, 16);
      bodyGeo.scale(1.2, 0.95, 1.1);
      const pumpkinMat = new THREE.MeshStandardMaterial({ color: 0xea580c, roughness: 0.6 });
      const body = new THREE.Mesh(bodyGeo, pumpkinMat);
      body.castShadow = true;
      pumpkinGroup.add(body);

      const stemGeo = new THREE.CylinderGeometry(0.04 * scale, 0.07 * scale, 0.25 * scale, 8);
      const stem = new THREE.Mesh(stemGeo, new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.9 }));
      stem.position.y = 0.55 * scale;
      stem.rotation.z = 0.15;
      pumpkinGroup.add(stem);

      const interiorMat = new THREE.MeshBasicMaterial({ color: glowColor });
      const eyeL = new THREE.Mesh(new THREE.ConeGeometry(0.09 * scale, 0.14 * scale, 3), interiorMat);
      eyeL.position.set(-0.22 * scale, 0.1 * scale, 0.55 * scale);
      eyeL.rotation.x = Math.PI / 2;
      pumpkinGroup.add(eyeL);

      const eyeR = new THREE.Mesh(new THREE.ConeGeometry(0.09 * scale, 0.14 * scale, 3), interiorMat);
      eyeR.position.set(0.22 * scale, 0.1 * scale, 0.55 * scale);
      eyeR.rotation.x = Math.PI / 2;
      pumpkinGroup.add(eyeR);

      const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.35 * scale, 0.08 * scale, 0.1 * scale), interiorMat);
      mouth.position.set(0, -0.16 * scale, 0.56 * scale);
      pumpkinGroup.add(mouth);

      pumpkinGroup.position.set(x, y, z);
      scene.add(pumpkinGroup);
      return pumpkinGroup;
    }

    createPumpkin(-2.6, 0.45, 0.8, 0.9, 0xfde047);
    createPumpkin(-2.1, 0.35, 1.6, 0.7, 0xf97316);
    createPumpkin(2.6, 0.45, 0.8, 0.9, 0xa855f7);
    createPumpkin(2.1, 0.35, 1.6, 0.7, 0x4ade80);

    // 7. 3D Bats Flock
    const bats: { mesh: THREE.Group; speed: number; radius: number; angle: number; y: number }[] = [];
    const batWingMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.9, side: THREE.DoubleSide });

    for (let b = 0; b < 10; b++) {
      const batGroup = new THREE.Group();
      const batBody = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.22, 6), batWingMat);
      batBody.rotation.x = Math.PI / 2;
      batGroup.add(batBody);

      const wingLGeo = new THREE.BufferGeometry();
      wingLGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0, -0.35, 0.12, -0.05, -0.2, -0.15, 0]), 3));
      const wingL = new THREE.Mesh(wingLGeo, batWingMat);
      wingL.name = 'wingL';
      batGroup.add(wingL);

      const wingRGeo = new THREE.BufferGeometry();
      wingRGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0, 0.35, 0.12, -0.05, 0.2, -0.15, 0]), 3));
      const wingR = new THREE.Mesh(wingRGeo, batWingMat);
      wingR.name = 'wingR';
      batGroup.add(wingR);

      batGroup.scale.setScalar(0.7 + Math.random() * 0.5);
      scene.add(batGroup);

      bats.push({
        mesh: batGroup,
        speed: 0.8 + Math.random() * 0.9,
        radius: 3.2 + Math.random() * 2.5,
        angle: (b / 10) * Math.PI * 2,
        y: 2.6 + Math.random() * 2.0,
      });
    }
    batsRef.current = bats;

    // 8. THE PLOTTER MACHINE: GRAPHTEC FCX2000 (3D GLB Model)
    const plotterMainGroup = new THREE.Group();
    plotterMainGroup.position.set(0, 0, 0);
    scene.add(plotterMainGroup);
    plotterGroupRef.current = plotterMainGroup;

    // A) Procedural Plotter Base (Graphtec Stand & Bed structure - fallback inmediato)
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x181820, roughness: 0.5, metalness: 0.6 });
    const bedMat = new THREE.MeshStandardMaterial({ color: 0x272733, roughness: 0.4, metalness: 0.3 });
    const railMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.2, metalness: 0.85 });

    const proceduralMachine = new THREE.Group();
    proceduralMachine.name = 'proceduralMachine';

    // 4 Heavy duty steel stand legs
    const legGeo = new THREE.BoxGeometry(0.12, 1.0, 0.12);
    [
      [-1.4, 0.5, -0.8],
      [1.4, 0.5, -0.8],
      [-1.4, 0.5, 0.8],
      [1.4, 0.5, 0.8],
    ].forEach(([lx, ly, lz]) => {
      const leg = new THREE.Mesh(legGeo, baseMat);
      leg.position.set(lx, ly, lz);
      leg.castShadow = true;
      proceduralMachine.add(leg);
    });

    // Lower shelf/braces
    const lowerShelf = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.05, 1.5), baseMat);
    lowerShelf.position.set(0, 0.2, 0);
    proceduralMachine.add(lowerShelf);

    // Main Plotter Chassis Bed Frame
    const chassisGeo = new THREE.BoxGeometry(3.1, 0.16, 1.9);
    const chassis = new THREE.Mesh(chassisGeo, baseMat);
    chassis.position.set(0, 0.94, 0);
    chassis.castShadow = true;
    chassis.receiveShadow = true;
    proceduralMachine.add(chassis);

    // Vacuum Bed Table Surface (Dark electro-static bed)
    const bedTableGeo = new THREE.BoxGeometry(2.7, 0.04, 1.75);
    const bedTable = new THREE.Mesh(bedTableGeo, bedMat);
    bedTable.position.set(0, 1.02, 0);
    bedTable.receiveShadow = true;
    proceduralMachine.add(bedTable);

    // Left & Right Y-Axis Linear Guide Rails
    const railGeo = new THREE.CylinderGeometry(0.025, 0.025, 1.8, 16);
    const leftRail = new THREE.Mesh(railGeo, railMat);
    leftRail.rotation.x = Math.PI / 2;
    leftRail.position.set(-1.42, 1.04, 0);
    proceduralMachine.add(leftRail);

    const rightRail = new THREE.Mesh(railGeo, railMat);
    rightRail.rotation.x = Math.PI / 2;
    rightRail.position.set(1.42, 1.04, 0);
    proceduralMachine.add(rightRail);

    // Graphtec Control Console / LCD Keypad Panel
    const panelGeo = new THREE.BoxGeometry(0.35, 0.08, 0.22);
    const panelMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3 });
    const panel = new THREE.Mesh(panelGeo, panelMat);
    panel.position.set(1.3, 1.08, 0.85);
    panel.rotation.x = -0.3;
    proceduralMachine.add(panel);

    const lcdScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.08), new THREE.MeshBasicMaterial({ color: 0x22d3ee }));
    lcdScreen.position.set(1.3, 1.13, 0.85);
    lcdScreen.rotation.x = -0.3;
    proceduralMachine.add(lcdScreen);

    plotterMainGroup.add(proceduralMachine);

    // B) Load and Setup Animated Parts of the Official Graphtec FCX2000 GLB
    const gltfLoader = new GLTFLoader();
    gltfLoader.load(
      '/models/graphtec_fcx2000.glb',
      (gltf) => {
        const glbModel = gltf.scene;

        const box = new THREE.Box3().setFromObject(glbModel);
        const size = new THREE.Vector3();
        box.getSize(size);

        // Scale model to match standard workshop size (~3.25m width)
        const scaleFactor = 3.25 / (size.x || 178);
        glbScaleFactorRef.current = scaleFactor;
        glbModel.scale.setScalar(scaleFactor);

        const scaledBox = new THREE.Box3().setFromObject(glbModel);
        glbModel.position.set(0, -scaledBox.min.y, 0);

        // Separate and index individual movable parts of the real GLB model
        const gMeshes: THREE.Mesh[] = [];
        const hMeshes: THREE.Mesh[] = [];
        const pMeshes: THREE.Mesh[] = [];

        glbModel.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            const name = child.name;
            if (GANTRY_NAMES.has(name)) {
              gMeshes.push(child as THREE.Mesh);
            } else if (HEAD_NAMES.has(name)) {
              hMeshes.push(child as THREE.Mesh);
            } else if (PEN_NAMES.has(name)) {
              pMeshes.push(child as THREE.Mesh);
            }
          }
        });

        glbGantryMeshesRef.current = gMeshes;
        glbHeadMeshesRef.current = hMeshes;
        glbPenMeshesRef.current = pMeshes;
        isGlbLoadedRef.current = true;

        plotterMainGroup.add(glbModel);

        // Hide procedural stand and procedural gantry once the real GLB is active
        const proc = plotterMainGroup.getObjectByName('proceduralMachine');
        if (proc) proc.visible = false;
        if (gantryBeamRef.current) gantryBeamRef.current.visible = false;
      },
      undefined,
      (error) => {
        console.warn('Using procedural Graphtec Plotter rig (GLB loading fallback):', error);
      }
    );

    // 9. THE DRAWING CANVAS PAPER (Pliego de Papel en la Mesa de Corte)
    const initialCanvas = document.createElement('canvas');
    initialCanvas.width = 1024;
    initialCanvas.height = 1024;
    const initialCtx = initialCanvas.getContext('2d')!;
    initialCtx.fillStyle = '#0c0816';
    initialCtx.fillRect(0, 0, 1024, 1024);

    const canvasTexture = new THREE.CanvasTexture(initialCanvas);
    canvasTexture.minFilter = THREE.LinearFilter;
    canvasTexture.magFilter = THREE.LinearFilter;
    textureRef.current = canvasTexture;

    // Drafting Paper Sheet lying flat on the vacuum bed
    const paperGeo = new THREE.PlaneGeometry(paperWidth, paperHeight);
    const paperMat = new THREE.MeshStandardMaterial({
      map: canvasTexture,
      roughness: 0.45,
      metalness: 0.05,
    });
    const paperMesh = new THREE.Mesh(paperGeo, paperMat);
    paperMesh.rotation.x = -Math.PI / 2;
    paperMesh.position.set(0, bedHeight + 0.005, 0);
    paperMesh.receiveShadow = true;
    plotterMainGroup.add(paperMesh);

    // Paper Corner Tape / Vacuum Guides
    const cornerMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.6 });
    [
      [-paperWidth / 2, -paperHeight / 2],
      [paperWidth / 2, -paperHeight / 2],
      [-paperWidth / 2, paperHeight / 2],
      [paperWidth / 2, paperHeight / 2],
    ].forEach(([cx, cz]) => {
      const tape = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.006, 0.04), cornerMat);
      tape.position.set(cx, bedHeight + 0.007, cz);
      plotterMainGroup.add(tape);
    });

    // 10. PROCEDURAL CNC GANTRY (Usado como fallback antes de que cargue el GLB)
    const gantryGroup = new THREE.Group();
    gantryGroup.position.set(0, bedHeight + 0.12, 0);
    plotterMainGroup.add(gantryGroup);
    gantryBeamRef.current = gantryGroup;

    const beamGeo = new THREE.BoxGeometry(3.0, 0.07, 0.14);
    const beamMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.35, metalness: 0.8 });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.castShadow = true;
    gantryGroup.add(beam);

    const endBlockGeo = new THREE.BoxGeometry(0.14, 0.14, 0.28);
    const endBlockMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 });
    const endL = new THREE.Mesh(endBlockGeo, endBlockMat);
    endL.position.set(-1.42, 0, 0);
    gantryGroup.add(endL);

    const endR = new THREE.Mesh(endBlockGeo, endBlockMat);
    endR.position.set(1.42, 0, 0);
    gantryGroup.add(endR);

    const carriageGroup = new THREE.Group();
    carriageGroup.position.set(0, 0, 0.1);
    gantryGroup.add(carriageGroup);
    toolCarriageRef.current = carriageGroup;

    const toolBody = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.16, 0.16), new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.7 }));
    toolBody.castShadow = true;
    carriageGroup.add(toolBody);

    const penAssembly = new THREE.Group();
    carriageGroup.add(penAssembly);
    penMeshRef.current = penAssembly;

    const clampMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.14, 12), new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.8, roughness: 0.2 }));
    clampMesh.position.set(0, -0.06, 0.06);
    penAssembly.add(clampMesh);

    const penNib = new THREE.Mesh(new THREE.ConeGeometry(0.009, 0.08, 12), new THREE.MeshBasicMaterial({ color: 0x22c55e }));
    penNib.position.set(0, -0.14, 0.06);
    penNib.rotation.x = Math.PI;
    penAssembly.add(penNib);

    // Glow Light right at the pen tip
    const penLight = new THREE.PointLight(0x22c55e, 2.0, 1.2);
    penLight.position.set(0, -0.15, 0.06);
    penAssembly.add(penLight);
    penTipLightRef.current = penLight;

    // Red Laser Targeting Crosshair Beam on the paper (SIEMPRE ACTIVO)
    const laserGeo = new THREE.RingGeometry(0.015, 0.022, 16);
    const laserMat = new THREE.MeshBasicMaterial({ color: 0xef4444, side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
    const laserCrosshair = new THREE.Mesh(laserGeo, laserMat);
    laserCrosshair.rotation.x = -Math.PI / 2;
    laserCrosshair.position.set(0, bedHeight + 0.006, 0);
    plotterMainGroup.add(laserCrosshair);
    laserCrosshairRef.current = laserCrosshair;

    // 11. Spark Particles System for Plotting
    const sparkCount = 80;
    const sparkGeo = new THREE.BufferGeometry();
    const sparkPositions = new Float32Array(sparkCount * 3);
    for (let i = 0; i < sparkCount; i++) {
      sparkPositions[i * 3] = 0;
      sparkPositions[i * 3 + 1] = bedHeight;
      sparkPositions[i * 3 + 2] = 0;
    }
    sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPositions, 3));
    sparkGeoRef.current = sparkGeo;
    sparkPositionsRef.current = sparkPositions;

    const sparkMat = new THREE.PointsMaterial({
      size: 0.045,
      color: 0x38bdf8,
      transparent: true,
      blending: THREE.AdditiveBlending,
    });
    const sparkPoints = new THREE.Points(sparkGeo, sparkMat);
    scene.add(sparkPoints);

    // 12. Mouse / Touch Orbit Controls
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let cameraRotY = 0;
    let cameraRotX = 0.2;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - prevMouseX;
      const deltaY = e.clientY - prevMouseY;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;

      cameraRotY -= deltaX * 0.005;
      cameraRotX = Math.max(-0.2, Math.min(1.2, cameraRotX + deltaY * 0.005));
    };
    const onMouseUp = () => {
      isDragging = false;
    };

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    // Resize handler
    const onResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // 13. Main 60 FPS Plotter Animation Loop
    const clock = new THREE.Clock();
    let sparkIndex = 0;
    let animId: number;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // Jack-o'-lantern lights flicker
      pumpkinsLightRef.current.forEach((light, idx) => {
        const noise = Math.sin(elapsed * (7 + idx * 3)) * 0.35 + Math.cos(elapsed * 13) * 0.2;
        light.intensity = 2.8 + noise;
      });

      // Animate Bats flying in orbit
      batsRef.current.forEach((bat) => {
        bat.angle += delta * bat.speed;
        const bx = Math.cos(bat.angle) * bat.radius;
        const bz = Math.sin(bat.angle) * bat.radius;
        bat.mesh.position.set(bx, bat.y + Math.sin(elapsed * 3 + bat.angle) * 0.3, bz);
        bat.mesh.rotation.y = -bat.angle + Math.PI / 2;

        const flap = Math.sin(elapsed * 18 + bat.speed) * 0.7;
        const wL = bat.mesh.getObjectByName('wingL');
        const wR = bat.mesh.getObjectByName('wingR');
        if (wL) wL.rotation.z = flap;
        if (wR) wR.rotation.z = -flap;
      });

      // UPDATE PLOTTER CNC GANTRY & CARRIAGE
      if (sessionRef.current && textureRef.current) {
        const session = sessionRef.current;

        // Render progressive canvas frame
        const { quillX, quillY, isDrawing } = session.renderProgress(drawingProgress);
        textureRef.current.needsUpdate = true;

        // Completion trigger check
        if (drawingProgress >= 1.0 && !hasTriggeredFanfareRef.current) {
          hasTriggeredFanfareRef.current = true;
          halloweenAudio.playVictoryFanfare();
          if (onDrawingCompleted && currentDrawing) {
            onDrawingCompleted(currentDrawing);
          }
        }

        // Map normalized 2D canvas coordinates (0..1) to physical 3D plotter bed coordinates:
        // Paper width = 2.0 (X: -1.0 to +1.0)
        // Paper height = 1.6 (Z: -0.8 to +0.8)
        const targetX = (quillX - 0.5) * paperWidth;
        const targetZ = (quillY - 0.5) * paperHeight;

        // A) ANIMATE ACTUAL PIECES OF THE GRAPHTEC GLB MODEL
        if (isGlbLoadedRef.current) {
          const scale = glbScaleFactorRef.current || 0.01825;
          // In local coordinate space:
          // X: Bridge rest is at X = 25.6
          // Y: Head rest is at Y = -28.5 (world Z maps to local -Y)
          // Z: Pen rest is at Z = 101.8 (pen lift = +2.5 cm)
          const targetDeltaX = (targetX / scale) - 25.6;
          const targetDeltaY = (-targetZ / scale) + 28.5;
          const targetDeltaZ = (isDrawing ? 0 : 2.5);

          // 1. Gantry Bridge Meshes (Object_2, Object_12, Object_23)
          glbGantryMeshesRef.current.forEach((m) => {
            m.position.x += (targetDeltaX - m.position.x) * 0.22;
          });

          // 2. Tool Head Carriage Meshes (Object_13..47)
          glbHeadMeshesRef.current.forEach((m) => {
            m.position.x += (targetDeltaX - m.position.x) * 0.22;
            m.position.y += (targetDeltaY - m.position.y) * 0.22;
          });

          // 3. Pen Plunger Meshes (Object_48..51)
          glbPenMeshesRef.current.forEach((m) => {
            m.position.x += (targetDeltaX - m.position.x) * 0.22;
            m.position.y += (targetDeltaY - m.position.y) * 0.22;
            m.position.z += (targetDeltaZ - m.position.z) * 0.35;
          });
        } else if (gantryBeamRef.current && toolCarriageRef.current) {
          // Fallback procedural gantry animation
          const gantry = gantryBeamRef.current;
          const carriage = toolCarriageRef.current;
          gantry.position.z += (targetZ - gantry.position.z) * 0.22;
          carriage.position.x += (targetX - carriage.position.x) * 0.22;
          if (penMeshRef.current) {
            const targetPenY = isDrawing ? 0 : 0.02;
            penMeshRef.current.position.y += (targetPenY - penMeshRef.current.position.y) * 0.3;
          }
        }

        // Red Laser Targeting Crosshair Beam on the paper
        if (laserCrosshairRef.current) {
          laserCrosshairRef.current.position.x += (targetX - laserCrosshairRef.current.position.x) * 0.22;
          laserCrosshairRef.current.position.z += (targetZ - laserCrosshairRef.current.position.z) * 0.22;
          laserCrosshairRef.current.scale.setScalar(1.0 + Math.sin(elapsed * 15) * 0.15);
        }

        // Color update according to gift tier
        if (penTipLightRef.current) {
          penTipLightRef.current.position.set(targetX, bedHeight + 0.04, targetZ);
          penTipLightRef.current.color.setHex(session.tierConfig.particleColor);
        }

        // Emit plotter sparks at the pen tip
        if (isDrawing && sparkPositionsRef.current && sparkGeoRef.current) {
          const spPos = sparkPositionsRef.current;
          spPos[sparkIndex * 3] = targetX + (Math.random() - 0.5) * 0.03;
          spPos[sparkIndex * 3 + 1] = bedHeight + 0.008;
          spPos[sparkIndex * 3 + 2] = targetZ + (Math.random() - 0.5) * 0.03;
          sparkIndex = (sparkIndex + 1) % sparkCount;
          sparkGeoRef.current.attributes.position.needsUpdate = true;
        }
      } else if (isGlbLoadedRef.current) {
        // Idle gentle park breathing
        const idleX = Math.sin(elapsed * 0.6) * 15;
        const idleY = Math.cos(elapsed * 0.8) * 12;
        glbGantryMeshesRef.current.forEach((m) => { m.position.x += (idleX - m.position.x) * 0.05; });
        glbHeadMeshesRef.current.forEach((m) => {
          m.position.x += (idleX - m.position.x) * 0.05;
          m.position.y += (idleY - m.position.y) * 0.05;
        });
      }

      // CAMERA POSITIONING ACCORDING TO PLOTTER MODES
      if (cameraRef.current) {
        if (cameraMode === 'topdown') {
          // Bird's-Eye Top-Down view directly looking at the plotter bed
          cameraRef.current.position.set(0, 3.4, 0.01);
          cameraRef.current.lookAt(0, bedHeight, 0);
        } else if (cameraMode === 'stream') {
          // Front isometric stream view optimized for 9:16 or horizontal stream
          cameraRef.current.position.set(0, 2.5, 2.6);
          cameraRef.current.lookAt(0, bedHeight + 0.05, 0);
        } else if (cameraMode === 'cinematic') {
          // Dynamic camera gliding smoothly around the plotter machine
          const zoomFactor = currentDrawing ? (drawingProgress < 0.85 ? 0.9 : 1.1) : 1.0;
          const targetDist = 3.6 * zoomFactor;
          const camX = Math.sin(elapsed * 0.2 + cameraRotY) * targetDist;
          const camZ = Math.cos(elapsed * 0.2 + cameraRotY) * targetDist;
          const camY = 2.1 + Math.sin(elapsed * 0.35) * 0.25 + cameraRotX * 1.5;

          cameraRef.current.position.set(camX, camY, camZ);
          cameraRef.current.lookAt(0, bedHeight + 0.05, 0);
        } else {
          // Free Orbit Drag Mode
          const dist = 3.8;
          const camX = Math.sin(cameraRotY) * Math.cos(cameraRotX) * dist;
          const camY = 1.3 + Math.sin(cameraRotX) * dist * 1.2;
          const camZ = Math.cos(cameraRotY) * Math.cos(cameraRotX) * dist;
          cameraRef.current.position.set(camX, camY, camZ);
          cameraRef.current.lookAt(0, bedHeight, 0);
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    // Cleanup
    return () => {
      cancelAnimationFrame(animId);
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
    };
  }, [cameraMode, onDrawingCompleted]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-[600px] overflow-hidden select-none cursor-grab active:cursor-grabbing"
    />
  );
};
