'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { HalloweenDrawingSession, DrawingUser } from './drawingEngine';
import { halloweenAudio } from './halloweenAudio';
import confetti from 'canvas-confetti';

interface HalloweenScene3DProps {
  currentDrawing: DrawingUser | null;
  drawingProgress: number; // 0 to 1
  onDrawingCompleted?: (user: DrawingUser) => void;
  cameraMode: 'cinematic' | 'stream' | 'free';
  particleBurstCount: number;
}

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
  const quillMeshRef = useRef<THREE.Group | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const pumpkinsLightRef = useRef<THREE.PointLight[]>([]);
  const batsRef = useRef<{ mesh: THREE.Group; speed: number; radius: number; angle: number; y: number }[]>([]);
  const sparkParticlesRef = useRef<THREE.Points | null>(null);
  const sparkGeoRef = useRef<THREE.BufferGeometry | null>(null);
  const sparkPositionsRef = useRef<Float32Array | null>(null);
  const sparkOpacitiesRef = useRef<Float32Array | null>(null);

  // Confetti trigger ref
  const lastBurstRef = useRef<number>(0);
  const hasTriggeredFanfareRef = useRef<boolean>(false);

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

    // Sonido de inicio según diamantes
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
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#f97316', '#a855f7', '#fbbf24', '#10b981'],
        });
      } catch {}
    }
  }, [particleBurstCount]);

  // Three.js Scene Setup
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x06030c);
    scene.fog = new THREE.FogExp2(0x0a0614, 0.04);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    cameraRef.current = camera;
    camera.position.set(0, 1.8, 6.2);

    // 2. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    container.replaceChildren(renderer.domElement);

    // 3. Spooky Lighting
    const ambientLight = new THREE.AmbientLight(0x1e1538, 1.2);
    scene.add(ambientLight);

    // Moonlight
    const moonLight = new THREE.DirectionalLight(0xa5b4fc, 1.4);
    moonLight.position.set(-6, 12, 5);
    moonLight.castShadow = true;
    moonLight.shadow.mapSize.width = 1024;
    moonLight.shadow.mapSize.height = 1024;
    moonLight.shadow.bias = -0.001;
    scene.add(moonLight);

    // Jack-o-lantern Point Lights
    const pLight1 = new THREE.PointLight(0xf97316, 3.5, 7);
    pLight1.position.set(-2.2, 0.4, 0.5);
    scene.add(pLight1);

    const pLight2 = new THREE.PointLight(0xa855f7, 3.2, 7);
    pLight2.position.set(2.2, 0.4, 0.5);
    scene.add(pLight2);

    const altarLight = new THREE.PointLight(0x06b6d4, 1.8, 5);
    altarLight.position.set(0, 0.1, 1.5);
    scene.add(altarLight);

    pumpkinsLightRef.current = [pLight1, pLight2];

    // 4. Floor (Dark cracked stone slab)
    const floorGeo = new THREE.PlaneGeometry(30, 30, 32, 32);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0f0b18,
      roughness: 0.85,
      metalness: 0.15,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Magic Rune Circle on floor
    const runeRingGeo = new THREE.RingGeometry(1.6, 2.4, 32);
    const runeRingMat = new THREE.MeshBasicMaterial({
      color: 0x7c3aed,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.4,
    });
    const runeRing = new THREE.Mesh(runeRingGeo, runeRingMat);
    runeRing.rotation.x = -Math.PI / 2;
    runeRing.position.y = 0.01;
    scene.add(runeRing);

    // 5. Giant Harvest Moon in the background
    const moonGeo = new THREE.SphereGeometry(3.5, 32, 32);
    const moonMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
    });
    const moon = new THREE.Mesh(moonGeo, moonMat);
    moon.position.set(-9, 14, -20);
    scene.add(moon);

    // Moon Glow Halo
    const moonGlowGeo = new THREE.RingGeometry(3.5, 6.5, 32);
    const moonGlowMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
    });
    const moonGlow = new THREE.Mesh(moonGlowGeo, moonGlowMat);
    moonGlow.position.copy(moon.position);
    moonGlow.position.z += 0.1;
    scene.add(moonGlow);

    // 6. 3D Jack-o'-Lanterns (Calabazas Talladas)
    function createPumpkin(x: number, y: number, z: number, scale: number, glowColor: number) {
      const pumpkinGroup = new THREE.Group();

      // Main pumpkin ribbed segments
      const bodyGeo = new THREE.SphereGeometry(0.55 * scale, 16, 16);
      bodyGeo.scale(1.2, 0.95, 1.1);
      const pumpkinMat = new THREE.MeshStandardMaterial({
        color: 0xea580c,
        roughness: 0.6,
        metalness: 0.1,
      });
      const body = new THREE.Mesh(bodyGeo, pumpkinMat);
      body.castShadow = true;
      pumpkinGroup.add(body);

      // Pumpkin stem
      const stemGeo = new THREE.CylinderGeometry(0.04 * scale, 0.07 * scale, 0.25 * scale, 8);
      const stemMat = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.9 });
      const stem = new THREE.Mesh(stemGeo, stemMat);
      stem.position.y = 0.55 * scale;
      stem.rotation.z = 0.15;
      pumpkinGroup.add(stem);

      // Carved eyes and mouth with glowing interior
      const faceGeo = new THREE.SphereGeometry(0.54 * scale, 12, 12);
      faceGeo.scale(1.21, 0.96, 1.11);
      const interiorMat = new THREE.MeshBasicMaterial({
        color: glowColor,
      });
      // Triangular eyes
      const eyeL = new THREE.Mesh(new THREE.ConeGeometry(0.09 * scale, 0.14 * scale, 3), interiorMat);
      eyeL.position.set(-0.22 * scale, 0.1 * scale, 0.55 * scale);
      eyeL.rotation.x = Math.PI / 2;
      pumpkinGroup.add(eyeL);

      const eyeR = new THREE.Mesh(new THREE.ConeGeometry(0.09 * scale, 0.14 * scale, 3), interiorMat);
      eyeR.position.set(0.22 * scale, 0.1 * scale, 0.55 * scale);
      eyeR.rotation.x = Math.PI / 2;
      pumpkinGroup.add(eyeR);

      // Jagged mouth
      const mouthGeo = new THREE.BoxGeometry(0.35 * scale, 0.08 * scale, 0.1 * scale);
      const mouth = new THREE.Mesh(mouthGeo, interiorMat);
      mouth.position.set(0, -0.16 * scale, 0.56 * scale);
      pumpkinGroup.add(mouth);

      pumpkinGroup.position.set(x, y, z);
      scene.add(pumpkinGroup);
      return pumpkinGroup;
    }

    createPumpkin(-2.2, 0.45, 0.5, 1.0, 0xfde047);
    createPumpkin(-1.7, 0.35, 1.2, 0.75, 0xf97316);
    createPumpkin(2.2, 0.45, 0.5, 1.0, 0xa855f7);
    createPumpkin(1.7, 0.35, 1.2, 0.75, 0x4ade80);

    // 7. 3D Bats Flock
    const bats: { mesh: THREE.Group; speed: number; radius: number; angle: number; y: number }[] = [];
    const batWingMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.9,
      side: THREE.DoubleSide,
    });

    for (let b = 0; b < 10; b++) {
      const batGroup = new THREE.Group();
      // Bat Body
      const batBody = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.22, 6), batWingMat);
      batBody.rotation.x = Math.PI / 2;
      batGroup.add(batBody);

      // Bat Left Wing
      const wingLGeo = new THREE.BufferGeometry();
      const verticesL = new Float32Array([
        0, 0, 0,
        -0.35, 0.12, -0.05,
        -0.2, -0.15, 0,
      ]);
      wingLGeo.setAttribute('position', new THREE.BufferAttribute(verticesL, 3));
      const wingL = new THREE.Mesh(wingLGeo, batWingMat);
      wingL.name = 'wingL';
      batGroup.add(wingL);

      // Bat Right Wing
      const wingRGeo = new THREE.BufferGeometry();
      const verticesR = new Float32Array([
        0, 0, 0,
        0.35, 0.12, -0.05,
        0.2, -0.15, 0,
      ]);
      wingRGeo.setAttribute('position', new THREE.BufferAttribute(verticesR, 3));
      const wingR = new THREE.Mesh(wingRGeo, batWingMat);
      wingR.name = 'wingR';
      batGroup.add(wingR);

      batGroup.scale.setScalar(0.7 + Math.random() * 0.5);
      scene.add(batGroup);

      bats.push({
        mesh: batGroup,
        speed: 0.8 + Math.random() * 0.9,
        radius: 2.8 + Math.random() * 2.5,
        angle: (b / 10) * Math.PI * 2,
        y: 2.5 + Math.random() * 2.2,
      });
    }
    batsRef.current = bats;

    // 8. The Centerpiece: Haunted Easel & Live 3D Drawing Canvas
    const easelGroup = new THREE.Group();
    easelGroup.position.set(0, 0, 0);

    // Carved Wood Material
    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x271911,
      roughness: 0.75,
      metalness: 0.1,
    });

    // 3 Easel legs
    const legGeo = new THREE.CylinderGeometry(0.05, 0.06, 4.2, 8);
    // Left leg
    const legL = new THREE.Mesh(legGeo, woodMat);
    legL.position.set(-0.8, 2.0, 0);
    legL.rotation.z = 0.22;
    legL.castShadow = true;
    easelGroup.add(legL);

    // Right leg
    const legR = new THREE.Mesh(legGeo, woodMat);
    legR.position.set(0.8, 2.0, 0);
    legR.rotation.z = -0.22;
    legR.castShadow = true;
    easelGroup.add(legR);

    // Back leg
    const legBack = new THREE.Mesh(legGeo, woodMat);
    legBack.position.set(0, 2.0, -0.9);
    legBack.rotation.x = -0.24;
    legBack.castShadow = true;
    easelGroup.add(legBack);

    // Shelf crossbar
    const shelfGeo = new THREE.BoxGeometry(2.4, 0.1, 0.25);
    const shelf = new THREE.Mesh(shelfGeo, woodMat);
    shelf.position.set(0, 1.25, 0.15);
    shelf.castShadow = true;
    easelGroup.add(shelf);

    // Top clamp
    const clampGeo = new THREE.BoxGeometry(0.4, 0.12, 0.2);
    const clamp = new THREE.Mesh(clampGeo, woodMat);
    clamp.position.set(0, 3.3, 0.08);
    easelGroup.add(clamp);

    // The Canvas Mesh with Dynamic Texture
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

    const canvasWidth = 2.0;
    const canvasHeight = 2.0;
    const canvasBoardGeo = new THREE.BoxGeometry(canvasWidth, canvasHeight, 0.08);
    const canvasMaterials = [
      woodMat, // right
      woodMat, // left
      woodMat, // top
      woodMat, // bottom
      new THREE.MeshStandardMaterial({
        map: canvasTexture,
        roughness: 0.4,
        metalness: 0.1,
      }), // front (drawing surface!)
      woodMat, // back
    ];
    const canvasMesh = new THREE.Mesh(canvasBoardGeo, canvasMaterials);
    canvasMesh.position.set(0, 2.25, 0.1);
    canvasMesh.rotation.x = -0.06; // Slight natural easel tilt
    canvasMesh.castShadow = true;
    canvasMesh.receiveShadow = true;
    easelGroup.add(canvasMesh);

    scene.add(easelGroup);

    // 9. Floating 3D Bone Quill / Magic Brush
    const quillGroup = new THREE.Group();
    // Feather blade
    const featherGeo = new THREE.ConeGeometry(0.04, 0.65, 8);
    featherGeo.scale(0.3, 1, 1);
    const featherMat = new THREE.MeshStandardMaterial({
      color: 0x9333ea,
      emissive: 0x581c87,
      roughness: 0.5,
    });
    const feather = new THREE.Mesh(featherGeo, featherMat);
    feather.position.y = 0.35;
    feather.rotation.z = 0.1;
    quillGroup.add(feather);

    // Bone / Gold Grip
    const gripGeo = new THREE.CylinderGeometry(0.02, 0.015, 0.25, 8);
    const gripMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      metalness: 0.8,
      roughness: 0.2,
    });
    const grip = new THREE.Mesh(gripGeo, gripMat);
    quillGroup.add(grip);

    // Glowing Nib (Punta mágica de la pluma)
    const nibGeo = new THREE.ConeGeometry(0.012, 0.12, 8);
    const nibMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
    const nib = new THREE.Mesh(nibGeo, nibMat);
    nib.position.y = -0.16;
    nib.rotation.x = Math.PI;
    quillGroup.add(nib);

    // Spark light at the quill nib
    const quillLight = new THREE.PointLight(0x22c55e, 1.5, 1.2);
    quillLight.position.set(0, -0.2, 0);
    quillGroup.add(quillLight);

    quillGroup.position.set(0, 2.25, 0.3);
    quillGroup.rotation.z = -0.35;
    scene.add(quillGroup);
    quillMeshRef.current = quillGroup;

    // 10. Spark Particles System at the Quill Tip
    const sparkCount = 80;
    const sparkGeo = new THREE.BufferGeometry();
    const sparkPositions = new Float32Array(sparkCount * 3);
    const sparkOpacities = new Float32Array(sparkCount);
    for (let i = 0; i < sparkCount; i++) {
      sparkPositions[i * 3] = 0;
      sparkPositions[i * 3 + 1] = 0;
      sparkPositions[i * 3 + 2] = 0;
      sparkOpacities[i] = 0;
    }
    sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPositions, 3));
    sparkGeo.setAttribute('opacity', new THREE.BufferAttribute(sparkOpacities, 1));
    sparkGeoRef.current = sparkGeo;
    sparkPositionsRef.current = sparkPositions;
    sparkOpacitiesRef.current = sparkOpacities;

    const sparkMat = new THREE.PointsMaterial({
      size: 0.06,
      color: 0x38bdf8,
      transparent: true,
      blending: THREE.AdditiveBlending,
    });
    const sparkPoints = new THREE.Points(sparkGeo, sparkMat);
    scene.add(sparkPoints);
    sparkParticlesRef.current = sparkPoints;

    // 11. Mouse / Touch Orbit Controls (Interactivo)
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let cameraRotY = 0;
    let cameraRotX = 0;

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
      cameraRotX = Math.max(-0.4, Math.min(0.6, cameraRotX + deltaY * 0.005));
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

    // 12. Main Animation Loop
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

        // Flap wings
        const flap = Math.sin(elapsed * 18 + bat.speed) * 0.7;
        const wL = bat.mesh.getObjectByName('wingL');
        const wR = bat.mesh.getObjectByName('wingR');
        if (wL) wL.rotation.z = flap;
        if (wR) wR.rotation.z = -flap;
      });

      // Update 3D Drawing Position & Quill
      if (sessionRef.current && textureRef.current && quillMeshRef.current) {
        const session = sessionRef.current;

        // Render progressive canvas frame
        const { quillX, quillY, isDrawing } = session.renderProgress(drawingProgress);
        textureRef.current.needsUpdate = true;

        // Sound effect during drawing
        if (isDrawing && drawingProgress < 0.98) {
          halloweenAudio.startQuillScratch();
        } else {
          halloweenAudio.stopQuillScratch();
        }

        // Completion trigger check
        if (drawingProgress >= 1.0 && !hasTriggeredFanfareRef.current) {
          hasTriggeredFanfareRef.current = true;
          halloweenAudio.stopQuillScratch();
          halloweenAudio.playVictoryFanfare();
          if (onDrawingCompleted && currentDrawing) {
            onDrawingCompleted(currentDrawing);
          }
        }

        // Map normalized (0..1) 2D canvas coordinates to 3D world space on the easel canvas
        // Canvas width = 2.0, height = 2.0, center = (0, 2.25, 0.1)
        const targetWorldX = (quillX - 0.5) * canvasWidth;
        const targetWorldY = 2.25 + (0.5 - quillY) * canvasHeight;
        const targetWorldZ = 0.24; // Hovering right above the canvas face

        const qMesh = quillMeshRef.current;
        // Smooth interpolation of quill movement
        qMesh.position.x += (targetWorldX - qMesh.position.x) * 0.2;
        qMesh.position.y += (targetWorldY - qMesh.position.y) * 0.2;
        qMesh.position.z += (targetWorldZ - qMesh.position.z) * 0.2;

        // Slight natural stroke tilting
        qMesh.rotation.z = -0.3 + Math.sin(elapsed * 12) * 0.08;
        qMesh.rotation.x = 0.2 + Math.cos(elapsed * 10) * 0.06;

        // Emit spark particles at the quill nib
        if (isDrawing && sparkPositionsRef.current && sparkGeoRef.current) {
          const spPos = sparkPositionsRef.current;
          spPos[sparkIndex * 3] = qMesh.position.x + (Math.random() - 0.5) * 0.06;
          spPos[sparkIndex * 3 + 1] = qMesh.position.y - 0.16 + (Math.random() - 0.5) * 0.06;
          spPos[sparkIndex * 3 + 2] = qMesh.position.z + 0.02;
          sparkIndex = (sparkIndex + 1) % sparkCount;
          sparkGeoRef.current.attributes.position.needsUpdate = true;
        }

        // Update nib light color according to tier
        const nLight = qMesh.children.find((c) => c instanceof THREE.PointLight) as THREE.PointLight | undefined;
        if (nLight) {
          nLight.color.setHex(session.tierConfig.particleColor);
        }
      } else if (quillMeshRef.current) {
        // Idle gentle float when no drawing is active
        halloweenAudio.stopQuillScratch();
        quillMeshRef.current.position.set(
          Math.sin(elapsed * 1.5) * 0.3,
          2.3 + Math.cos(elapsed * 2.0) * 0.1,
          0.45
        );
        quillMeshRef.current.rotation.z = -0.25 + Math.sin(elapsed * 2) * 0.1;
      }

      // Camera Movements according to Mode
      if (cameraRef.current) {
        if (cameraMode === 'cinematic') {
          // Dynamic camera with gentle breathing and dramatic zoom
          const zoomFactor = currentDrawing ? (drawingProgress < 0.85 ? 0.85 : 1.1) : 1.0;
          const targetDist = 5.2 * zoomFactor;
          const camX = Math.sin(elapsed * 0.25 + cameraRotY) * targetDist;
          const camZ = Math.cos(elapsed * 0.25 + cameraRotY) * targetDist;
          const camY = 1.9 + Math.sin(elapsed * 0.4) * 0.2 + cameraRotX * 2;

          cameraRef.current.position.set(camX, camY, camZ);
          cameraRef.current.lookAt(0, 2.1, 0);
        } else if (cameraMode === 'stream') {
          // Fixed front view optimized for TikTok 9:16 or OBS Studio stream
          cameraRef.current.position.set(0, 2.25, 4.3);
          cameraRef.current.lookAt(0, 2.25, 0.1);
        } else {
          // Free Orbit Mode
          const dist = 5.8;
          const camX = Math.sin(cameraRotY) * Math.cos(cameraRotX) * dist;
          const camY = 2.0 + Math.sin(cameraRotX) * dist;
          const camZ = Math.cos(cameraRotY) * Math.cos(cameraRotX) * dist;
          cameraRef.current.position.set(camX, camY, camZ);
          cameraRef.current.lookAt(0, 2.1, 0);
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    // Cleanup
    return () => {
      cancelAnimationFrame(animId);
      halloweenAudio.stopQuillScratch();
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
