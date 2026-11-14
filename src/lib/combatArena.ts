/**
 * Three.js Combat Arena - Tactical 3D Scene
 * Initializes during transition, loads assets progressively
 * Reports loading progress to UI
 */

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";

export interface ArenaConfig {
  container: HTMLDivElement;
  onProgress?: (progress: number) => void;
  onReady?: () => void;
  onError?: (error: Error) => void;
}

export interface ArenaScene {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  animate: () => void;
  dispose: () => void;
  setSize: (width: number, height: number) => void;
  loadTrajectory: (trajectoryData: any) => void;
}

let dracoLoaderInitialized = false;

function initDRACOLoader(loader: GLTFLoader): void {
  if (dracoLoaderInitialized) return;
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath("https://www.gstatic.com/draco/v1/decoders/");
  loader.setDRACOLoader(dracoLoader);
  dracoLoaderInitialized = true;
}

function createGroundPlane(): THREE.Mesh {
  const geometry = new THREE.PlaneGeometry(2000, 2000, 50, 50);
  const material = new THREE.MeshStandardMaterial({
    color: 0x0a1620,
    roughness: 0.9,
    metalness: 0.1,
    side: THREE.DoubleSide,
  });
  const ground = new THREE.Mesh(geometry, material);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -5;
  ground.receiveShadow = true;
  return ground;
}

function createGridHelper(): THREE.GridHelper {
  return new THREE.GridHelper(2000, 100, 0x06b6d4, 0x06b6d4);
}

function createAtmosphere(): THREE.Object3D {
  const group = new THREE.Group();

  // Fog
  // scene.fog handled at scene level

  // Particle system for dust/atmosphere
  const particles = 2000;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particles * 3);
  const sizes = new Float32Array(particles);
  const alphas = new Float32Array(particles);

  for (let i = 0; i < particles; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 2000;
    positions[i * 3 + 1] = Math.random() * 200;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 2000;
    sizes[i] = Math.random() * 2 + 0.5;
    alphas[i] = Math.random() * 0.3 + 0.1;
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute("alpha", new THREE.BufferAttribute(alphas, 1));

  const material = new THREE.PointsMaterial({
    color: 0x06b6d4,
    size: 1,
    transparent: true,
    opacity: 0.3,
    vertexColors: false,
    sizeAttenuation: true,
  });

  const points = new THREE.Points(geometry, material);
  group.add(points);

  // Store references for animation
  (group as any).particleSystem = { geometry, material, positions, alphas };

  return group;
}

function createLighting(): THREE.Group {
  const group = new THREE.Group();

  // Ambient
  const ambient = new THREE.AmbientLight(0x1a2a3a, 0.5);
  group.add(ambient);

  // Main directional (sun)
  const sun = new THREE.DirectionalLight(0xffffee, 1.2);
  sun.position.set(100, 200, 50);
  sun.castShadow = true;
  sun.shadow.mapSize.width = 2048;
  sun.shadow.mapSize.height = 2048;
  sun.shadow.camera.near = 10;
  sun.shadow.camera.far = 500;
  sun.shadow.camera.left = -200;
  sun.shadow.camera.right = 200;
  sun.shadow.camera.top = 200;
  sun.shadow.camera.bottom = -200;
  sun.shadow.bias = -0.001;
  group.add(sun);

  // Rim light
  const rim = new THREE.DirectionalLight(0x06b6d4, 0.3);
  rim.position.set(-100, 50, -100);
  group.add(rim);

  // Point lights for tactical feel
  const tacticalLight1 = new THREE.PointLight(0x06b6d4, 2, 100);
  tacticalLight1.position.set(0, 20, 0);
  group.add(tacticalLight1);

  const tacticalLight2 = new THREE.PointLight(0x10b981, 1.5, 80);
  tacticalLight2.position.set(50, 15, 50);
  group.add(tacticalLight2);

  return group;
}

function createTrajectoryVisualization(trajectoryData: any): THREE.Group {
  const group = new THREE.Group();

  if (!trajectoryData || !trajectoryData.trajectory) return group;

  const points = trajectoryData.trajectory.map((p: any) => new THREE.Vector3(p.x, p.y, p.z || 0));

  // Main trajectory line
  const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0x06b6d4,
    linewidth: 3,
    transparent: true,
    opacity: 0.8,
  });
  const line = new THREE.Line(lineGeometry, lineMaterial);
  group.add(line);

  // Glow line (additive)
  const glowMaterial = new THREE.LineBasicMaterial({
    color: 0x06b6d4,
    linewidth: 6,
    transparent: true,
    opacity: 0.3,
    blending: THREE.AdditiveBlending,
  });
  const glowLine = new THREE.Line(lineGeometry, glowMaterial);
  group.add(glowLine);

  // Impact point marker
  if (points.length > 0) {
    const impact = points[points.length - 1];
    const markerGeometry = new THREE.RingGeometry(5, 8, 32);
    const markerMaterial = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
    });
    const marker = new THREE.Mesh(markerGeometry, markerMaterial);
    marker.position.copy(impact);
    marker.rotation.x = -Math.PI / 2;
    group.add(marker);

    // Pulse animation data
    (marker as any).pulseData = { time: 0, baseScale: 1 };
  }

  // Apex marker
  let maxHeight = 0;
  let apexPoint = points[0];
  for (const p of points) {
    if (p.y > maxHeight) {
      maxHeight = p.y;
      apexPoint = p;
    }
  }
  const apexGeometry = new THREE.SphereGeometry(2, 16, 16);
  const apexMaterial = new THREE.MeshBasicMaterial({
    color: 0x10b981,
    transparent: true,
    opacity: 0.9,
  });
  const apexMarker = new THREE.Mesh(apexGeometry, apexMaterial);
  apexMarker.position.copy(apexPoint);
  group.add(apexMarker);

  return group;
}

function createCrosshair(): THREE.Object3D {
  const group = new THREE.Group();

  const lineMat = new THREE.LineBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.8 });

  // Horizontal
  const hGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-20, 0, 0),
    new THREE.Vector3(-5, 0, 0),
    new THREE.Vector3(5, 0, 0),
    new THREE.Vector3(20, 0, 0),
  ]);
  // Vertical
  const vGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, -20, 0),
    new THREE.Vector3(0, -5, 0),
    new THREE.Vector3(0, 5, 0),
    new THREE.Vector3(0, 20, 0),
  ]);

  const hLine = new THREE.Line(hGeo, lineMat);
  const vLine = new THREE.Line(vGeo, lineMat);
  group.add(hLine, vLine);

  // Center dot
  const dotGeo = new THREE.RingGeometry(0.5, 2, 16);
  const dotMat = new THREE.MeshBasicMaterial({ color: 0x10b981, side: THREE.DoubleSide });
  const dot = new THREE.Mesh(dotGeo, dotMat);
  group.add(dot);

  return group;
}

export function createCombatArena(config: ArenaConfig): ArenaScene {
  const { container, onProgress, onReady, onError } = config;

  // Scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x030508);
  scene.fog = new THREE.FogExp2(0x030508, 0.0015);

  // Camera
  const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 5000);
  camera.position.set(0, 50, 100);
  camera.lookAt(0, 0, 0);

  // Renderer
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  container.appendChild(renderer.domElement);

  // Progress tracking
  let loadedAssets = 0;
  const totalAssets = 5; // ground, grid, atmosphere, lighting, trajectory
  function reportProgress(increment: number = 1) {
    loadedAssets += increment;
    const progress = Math.min(100, Math.round((loadedAssets / totalAssets) * 100));
    onProgress?.(progress);
  }

  // Load assets progressively
  // 1. Ground
  const ground = createGroundPlane();
  scene.add(ground);
  reportProgress();

  // 2. Grid
  const grid = createGridHelper();
  scene.add(grid);
  reportProgress();

  // 3. Atmosphere
  const atmosphere = createAtmosphere();
  scene.add(atmosphere);
  reportProgress();

  // 4. Lighting
  const lighting = createLighting();
  scene.add(lighting);
  reportProgress();

  // 5. Crosshair (HUD)
  const crosshair = createCrosshair();
  crosshair.position.set(0, 0, -50);
  camera.add(crosshair);
  reportProgress();

  // Animation loop
  let animationId: number;
  let trajectoryGroup: THREE.Group | null = null;
  let lastTime = 0;

  function animate(time: number = 0) {
    animationId = requestAnimationFrame(animate);
    const delta = (time - lastTime) * 0.001;
    lastTime = time;

    // Animate particles
    const particleSystem = (atmosphere as any).particleSystem;
    if (particleSystem) {
      const positions = particleSystem.positions;
      const alphas = particleSystem.alphas;
      for (let i = 0; i < positions.length / 3; i++) {
        positions[i * 3 + 1] -= delta * 2; // Slow fall
        if (positions[i * 3 + 1] < -5) {
          positions[i * 3 + 1] = 200;
          positions[i * 3] = (Math.random() - 0.5) * 2000;
          positions[i * 3 + 2] = (Math.random() - 0.5) * 2000;
        }
        // Pulse alpha
        alphas[i] = 0.1 + 0.2 * (0.5 + 0.5 * Math.sin(time * 0.001 + i));
      }
      particleSystem.geometry.attributes.position.needsUpdate = true;
      particleSystem.geometry.attributes.alpha.needsUpdate = true;
    }

    // Animate trajectory markers
    if (trajectoryGroup) {
      trajectoryGroup.children.forEach((child) => {
        const pulseData = (child as any).pulseData;
        if (pulseData) {
          pulseData.time += delta;
          const scale = pulseData.baseScale + 0.3 * Math.sin(pulseData.time * 5);
          child.scale.setScalar(scale);
          if (child instanceof THREE.Mesh && child.material) {
            const mat = child.material as THREE.MeshBasicMaterial;
            if (mat) mat.opacity = 0.5 + 0.3 * Math.sin(pulseData.time * 5);
          }
        }
      });
    }

    // Slow camera orbit
    camera.position.x = Math.sin(time * 0.0001) * 100;
    camera.position.z = Math.cos(time * 0.0001) * 100;
    camera.lookAt(0, 10, 0);

    renderer.render(scene, camera);
  }

  // Public API
  const arena: ArenaScene = {
    scene,
    camera,
    renderer,
    animate,
    dispose: () => {
      cancelAnimationFrame(animationId);
      renderer.dispose();
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    },
    setSize: (width: number, height: number) => {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    },
    loadTrajectory: (trajectoryData: any) => {
      if (trajectoryGroup) {
        scene.remove(trajectoryGroup);
        trajectoryGroup.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            obj.geometry.dispose();
            if (Array.isArray(obj.material)) {
              obj.material.forEach((m) => m.dispose());
            } else {
              obj.material.dispose();
            }
          }
        });
      }
      trajectoryGroup = createTrajectoryVisualization(trajectoryData);
      scene.add(trajectoryGroup);
    },
  };

  // Start animation
  animate();

  // Signal ready
  onReady?.();

  return arena;
}

/**
 * Load a GLTF model (for future asset loading)
 */
export async function loadGLTFModel(url: string, onProgress?: (progress: number) => void): Promise<THREE.Group> {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    initDRACOLoader(loader);

    loader.load(
      url,
      (gltf) => resolve(gltf.scene),
      (xhr) => {
        if (xhr.lengthComputable && onProgress) {
          onProgress((xhr.loaded / xhr.total) * 100);
        }
      },
      (error) => reject(error)
    );
  });
}