import { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';

interface Props {
  onEntityContact: () => void;
  onHUDUpdate: (data: { pos: THREE.Vector3; fps: number }) => void;
}

const BUILDING_COLORS = [
  0x1a2e1a, 0x162516, 0x1e331e, 0x122012, 0x243824,
  0x0e1c0e, 0x1c2e1c, 0x152415, 0x203520,
];
const ROAD_COLOR = 0x0a0f0a;
const GROUND_COLOR = 0x0c160c;
const FOG_COLOR = 0x060e06;

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function createBuilding(w: number, h: number, d: number, color: number) {
  const geo = new THREE.BoxGeometry(w, h, d, 1, 1, 1);
  const mat = new THREE.MeshLambertMaterial({
    color,
    wireframe: false,
  });
  // Add slight wireframe overlay for low-poly look
  const wireGeo = new THREE.EdgesGeometry(geo);
  const wireMat = new THREE.LineBasicMaterial({ color: 0x1a3d1a, linewidth: 1 });
  const mesh = new THREE.Mesh(geo, mat);
  const wire = new THREE.LineSegments(wireGeo, wireMat);
  mesh.add(wire);
  return mesh;
}

function createCity(scene: THREE.Scene): THREE.Vector3[] {
  // Ground plane
  const groundGeo = new THREE.PlaneGeometry(200, 200, 20, 20);
  const groundMat = new THREE.MeshLambertMaterial({ color: GROUND_COLOR });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  // Grid road lines
  const roadMat = new THREE.MeshLambertMaterial({ color: ROAD_COLOR });
  for (let i = -4; i <= 4; i++) {
    const roadH = new THREE.Mesh(new THREE.PlaneGeometry(200, 4, 1, 1), roadMat);
    roadH.rotation.x = -Math.PI / 2;
    roadH.position.set(0, 0.01, i * 22);
    scene.add(roadH);

    const roadV = new THREE.Mesh(new THREE.PlaneGeometry(4, 200, 1, 1), roadMat);
    roadV.rotation.x = -Math.PI / 2;
    roadV.position.set(i * 22, 0.01, 0);
    scene.add(roadV);
  }

  // Buildings arranged in city blocks
  const entityPositions: THREE.Vector3[] = [];

  for (let bx = -4; bx <= 4; bx++) {
    for (let bz = -4; bz <= 4; bz++) {
      const blockX = bx * 22;
      const blockZ = bz * 22;
      const numBuildings = randInt(3, 7);

      for (let b = 0; b < numBuildings; b++) {
        const w = rand(2.5, 7);
        const h = rand(3, 18);
        const d = rand(2.5, 7);
        const ox = rand(-7, 7);
        const oz = rand(-7, 7);
        const color = BUILDING_COLORS[Math.floor(Math.random() * BUILDING_COLORS.length)];

        const building = createBuilding(w, h, d, color);
        building.position.set(blockX + ox, h / 2, blockZ + oz);
        building.userData.isBuilding = true;
        building.userData.bbox = new THREE.Box3().setFromObject(building);
        scene.add(building);
      }

      // Occasionally place entity spawn point
      if (Math.random() < 0.05 && entityPositions.length < 3) {
        entityPositions.push(new THREE.Vector3(blockX, 0, blockZ));
      }
    }
  }

  // Street lamps
  for (let i = -3; i <= 3; i++) {
    for (let j = -3; j <= 3; j++) {
      const lx = i * 22 + 11;
      const lz = j * 22 + 11;

      const poleGeo = new THREE.CylinderGeometry(0.08, 0.1, 5, 4);
      const poleMat = new THREE.MeshLambertMaterial({ color: 0x1a2a1a });
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.set(lx, 2.5, lz);
      scene.add(pole);

      // Lamp light
      const light = new THREE.PointLight(0x80ff60, rand(0.3, 0.8), 12);
      light.position.set(lx, 5.2, lz);
      scene.add(light);
    }
  }

  // Debris / rubble on streets
  for (let i = 0; i < 60; i++) {
    const debrisGeo = new THREE.TetrahedronGeometry(rand(0.2, 0.6), 0);
    const debrisMat = new THREE.MeshLambertMaterial({ color: 0x141e14 });
    const debris = new THREE.Mesh(debrisGeo, debrisMat);
    debris.position.set(rand(-80, 80), 0.1, rand(-80, 80));
    debris.rotation.set(rand(0, Math.PI), rand(0, Math.PI), rand(0, Math.PI));
    scene.add(debris);
  }

  return entityPositions.length > 0
    ? entityPositions
    : [new THREE.Vector3(20, 0, 20), new THREE.Vector3(-30, 0, 15)];
}

function createEntity(scene: THREE.Scene, pos: THREE.Vector3): THREE.Group {
  const group = new THREE.Group();

  // Low-poly humanoid silhouette
  const bodyGeo = new THREE.CylinderGeometry(0.35, 0.4, 1.0, 5);
  const mat = new THREE.MeshLambertMaterial({ color: 0x080808 });
  const body = new THREE.Mesh(bodyGeo, mat);
  body.position.y = 1.2;

  const headGeo = new THREE.OctahedronGeometry(0.3, 0);
  const head = new THREE.Mesh(headGeo, mat);
  head.position.y = 2.0;

  const legLGeo = new THREE.CylinderGeometry(0.12, 0.1, 0.9, 4);
  const legL = new THREE.Mesh(legLGeo, mat);
  legL.position.set(-0.2, 0.45, 0);

  const legRGeo = new THREE.CylinderGeometry(0.12, 0.1, 0.9, 4);
  const legR = new THREE.Mesh(legRGeo, mat);
  legR.position.set(0.2, 0.45, 0);

  // Red eyes
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff2020 });
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.05, 4, 4), eyeMat);
  eyeL.position.set(-0.1, 2.05, 0.26);
  const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.05, 4, 4), eyeMat);
  eyeR.position.set(0.1, 2.05, 0.26);

  // Eye glow light
  const eyeLight = new THREE.PointLight(0xff2020, 1.5, 4);
  eyeLight.position.set(0, 2.0, 0.3);

  group.add(body, head, legL, legR, eyeL, eyeR, eyeLight);
  group.position.copy(pos);
  group.position.y = 0;
  scene.add(group);

  return group;
}

const CityEngine = ({ onEntityContact, onHUDUpdate }: Props) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const animFrameRef = useRef<number>(0);
  const keysRef = useRef<Set<string>>(new Set());
  const yawRef = useRef(0);
  const pitchRef = useRef(0);
  const contactedRef = useRef(false);
  const entitiesRef = useRef<THREE.Group[]>([]);
  const buildingsRef = useRef<THREE.Box3[]>([]);
  const pointerLockedRef = useRef(false);
  const fpsCounterRef = useRef({ frames: 0, last: performance.now() });

  const initScene = useCallback(() => {
    if (!mountRef.current) return;

    const W = mountRef.current.clientWidth;
    const H = mountRef.current.clientHeight;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: false });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.shadowMap.enabled = false;
    renderer.setClearColor(FOG_COLOR);
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(FOG_COLOR);
    scene.fog = new THREE.FogExp2(FOG_COLOR, 0.045);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(75, W / H, 0.1, 200);
    camera.position.set(0, 1.7, 0);
    cameraRef.current = camera;

    // Lighting — dark, moody
    const ambient = new THREE.AmbientLight(0x0a180a, 1.2);
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0x204020, 0.6);
    dirLight.position.set(10, 20, 10);
    scene.add(dirLight);

    // Build city
    const entityPositions = createCity(scene);

    // Collect building bboxes for collision
    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.userData.isBuilding) {
        buildingsRef.current.push(new THREE.Box3().setFromObject(obj));
      }
    });

    // Spawn entities
    entityPositions.forEach(pos => {
      entitiesRef.current.push(createEntity(scene, pos));
    });

    // Resize handler
    const onResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize);

    return () => window.removeEventListener('resize', onResize);
  }, []);

  const setupControls = useCallback(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.code);
      // Prevent page scroll
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) {
        e.preventDefault();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => keysRef.current.delete(e.code);

    const onMouseMove = (e: MouseEvent) => {
      if (!pointerLockedRef.current) return;
      yawRef.current -= e.movementX * 0.002;
      pitchRef.current -= e.movementY * 0.002;
      pitchRef.current = Math.max(-0.8, Math.min(0.8, pitchRef.current));
    };

    const onPointerLockChange = () => {
      pointerLockedRef.current = document.pointerLockElement === mountRef.current?.querySelector('canvas');
    };

    const onClick = () => {
      const canvas = mountRef.current?.querySelector('canvas');
      if (canvas && !pointerLockedRef.current) canvas.requestPointerLock();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mousemove', onMouseMove);
    document.addEventListener('pointerlockchange', onPointerLockChange);
    mountRef.current?.addEventListener('click', onClick);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('pointerlockchange', onPointerLockChange);
    };
  }, []);

  const startLoop = useCallback(() => {
    const camera = cameraRef.current!;
    const renderer = rendererRef.current!;
    const scene = sceneRef.current!;

    const speed = 0.08;
    const playerRadius = 0.4;
    const playerBox = new THREE.Box3();

    let time = 0;

    const loop = () => {
      animFrameRef.current = requestAnimationFrame(loop);
      time += 0.016;

      // FPS counter
      fpsCounterRef.current.frames++;
      const now = performance.now();
      if (now - fpsCounterRef.current.last > 1000) {
        const fps = fpsCounterRef.current.frames;
        fpsCounterRef.current = { frames: 0, last: now };
        onHUDUpdate({ pos: camera.position.clone(), fps });
      }

      // Movement
      const keys = keysRef.current;
      const euler = new THREE.Euler(pitchRef.current, yawRef.current, 0, 'YXZ');
      camera.quaternion.setFromEuler(euler);

      const forward = new THREE.Vector3(-Math.sin(yawRef.current), 0, -Math.cos(yawRef.current));
      const right = new THREE.Vector3(Math.cos(yawRef.current), 0, -Math.sin(yawRef.current));

      const move = new THREE.Vector3();
      if (keys.has('KeyW') || keys.has('ArrowUp')) move.addScaledVector(forward, speed);
      if (keys.has('KeyS') || keys.has('ArrowDown')) move.addScaledVector(forward, -speed);
      if (keys.has('KeyA') || keys.has('ArrowLeft')) move.addScaledVector(right, -speed);
      if (keys.has('KeyD') || keys.has('ArrowRight')) move.addScaledVector(right, speed);

      const nextPos = camera.position.clone().add(move);
      nextPos.y = 1.7;

      // Collision check
      playerBox.setFromCenterAndSize(nextPos, new THREE.Vector3(playerRadius * 2, 3, playerRadius * 2));
      let blocked = false;
      for (const bbox of buildingsRef.current) {
        if (bbox.intersectsBox(playerBox)) { blocked = true; break; }
      }
      if (!blocked) camera.position.copy(nextPos);

      // Clamp to city bounds
      camera.position.x = Math.max(-90, Math.min(90, camera.position.x));
      camera.position.z = Math.max(-90, Math.min(90, camera.position.z));

      // Entity animations + contact detection
      entitiesRef.current.forEach(entity => {
        entity.rotation.y = Math.sin(time * 0.5) * 0.15;
        // Slowly turn toward player
        const dx = camera.position.x - entity.position.x;
        const dz = camera.position.z - entity.position.z;
        const targetAngle = Math.atan2(dx, dz);
        entity.rotation.y += (targetAngle - entity.rotation.y) * 0.01;

        // Contact range
        const dist = camera.position.distanceTo(entity.position);
        if (dist < 4 && !contactedRef.current) {
          contactedRef.current = true;
          onEntityContact();
        }
      });

      // Flicker some lamps
      scene.traverse(obj => {
        if (obj instanceof THREE.PointLight && obj.color.g > 0.3) {
          obj.intensity = 0.3 + Math.sin(time * 2 + obj.position.x) * 0.2 + Math.random() * 0.05;
        }
      });

      renderer.render(scene, camera);
    };

    loop();
  }, [onEntityContact, onHUDUpdate]);

  useEffect(() => {
    const cleanupScene = initScene();
    const cleanupControls = setupControls();
    startLoop();

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      cleanupScene?.();
      cleanupControls?.();
      if (rendererRef.current && mountRef.current) {
        const canvas = mountRef.current.querySelector('canvas');
        if (canvas) mountRef.current.removeChild(canvas);
        rendererRef.current.dispose();
      }
      if (document.pointerLockElement) document.exitPointerLock();
    };
  }, [initScene, setupControls, startLoop]);

  return (
    <div
      ref={mountRef}
      className="absolute inset-0"
      style={{ cursor: pointerLockedRef.current ? 'none' : 'crosshair' }}
    />
  );
};

export default CityEngine;
