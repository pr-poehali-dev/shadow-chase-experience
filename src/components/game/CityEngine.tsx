import { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';

interface Props {
  onEntityContact: () => void;
  onHUDUpdate: (data: { pos: THREE.Vector3; fps: number; shadowDist: number; isLooking: boolean }) => void;
}

// ─── Palette ────────────────────────────────────────────────
const SKY_COLOR   = 0xd4b896;
const FOG_COLOR   = 0xc8aa80;
const ROAD_COLOR  = 0x8a8070;
const SIDEWALK    = 0xb0a090;
const GRASS_COLOR = 0x8aaa60;
const HOUSE_WALLS = [0xe8dcc8, 0xd4c8b0, 0xc8bca8, 0xdcd0bc, 0xe0d4be];
const HOUSE_ROOFS = [0xa06040, 0x8a5030, 0xb07050, 0x784830, 0xc08060];
const FENCE_COLOR = 0xf0ead8;
const TREE_TRUNK  = 0x6a4020;
const TREE_LEAVES = [0x6a9040, 0x5a8030, 0x789050, 0x4a7020];

function rand(a: number, b: number) { return Math.random() * (b - a) + a; }
function randInt(a: number, b: number) { return Math.floor(rand(a, b + 1)); }
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

function makeHouse(scene: THREE.Scene, x: number, z: number, rot = 0) {
  const g = new THREE.Group();
  const W = rand(4, 6), H = rand(3, 4.5), D = rand(5, 7);

  const wallMat = new THREE.MeshLambertMaterial({ color: pick(HOUSE_WALLS) });
  const wall = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), wallMat);
  wall.position.y = H / 2;
  g.add(wall);

  const roofMat = new THREE.MeshLambertMaterial({ color: pick(HOUSE_ROOFS) });
  const roof = new THREE.Mesh(new THREE.ConeGeometry(W * 0.78, H * 0.7, 4), roofMat);
  roof.position.y = H + H * 0.35;
  roof.rotation.y = Math.PI / 4;
  g.add(roof);

  const doorMat = new THREE.MeshLambertMaterial({ color: 0x6a4020 });
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.6, 0.1), doorMat);
  door.position.set(0, 0.8, D / 2 + 0.05);
  g.add(door);

  const winMat = new THREE.MeshLambertMaterial({ color: 0xd4e8f0, emissive: 0x8ab0c0, emissiveIntensity: 0.3 });
  [-W * 0.28, W * 0.28].forEach(wx => {
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.7, 0.1), winMat);
    win.position.set(wx, H * 0.6, D / 2 + 0.05);
    g.add(win);
  });

  g.position.set(x, 0, z);
  g.rotation.y = rot;
  scene.add(g);
  return g;
}

function makeTree(scene: THREE.Scene, x: number, z: number) {
  const g = new THREE.Group();
  const h = rand(2.5, 4.5);
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.18, h, 5),
    new THREE.MeshLambertMaterial({ color: TREE_TRUNK })
  );
  trunk.position.y = h / 2;
  g.add(trunk);
  const lh = rand(2, 3.5);
  const leaves = new THREE.Mesh(
    new THREE.ConeGeometry(rand(1, 1.8), lh, 5),
    new THREE.MeshLambertMaterial({ color: pick(TREE_LEAVES) })
  );
  leaves.position.y = h + lh * 0.45;
  g.add(leaves);
  g.position.set(x, 0, z);
  scene.add(g);
}

function makeFence(scene: THREE.Scene, x: number, z: number, length: number, axis: 'x' | 'z') {
  const mat = new THREE.MeshLambertMaterial({ color: FENCE_COLOR });
  const count = Math.floor(length / 0.8);
  for (let i = 0; i < count; i++) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.9, 0.1), mat);
    post.position.set(
      axis === 'x' ? x + i * 0.8 : x,
      0.45,
      axis === 'z' ? z + i * 0.8 : z
    );
    scene.add(post);
  }
  const rail = new THREE.Mesh(
    new THREE.BoxGeometry(axis === 'x' ? length : 0.06, 0.06, axis === 'z' ? length : 0.06),
    mat
  );
  rail.position.set(
    axis === 'x' ? x + length / 2 : x,
    0.65,
    axis === 'z' ? z + length / 2 : z
  );
  scene.add(rail);
}

function makeLamp(scene: THREE.Scene, x: number, z: number): THREE.PointLight {
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x707060 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 5.5, 6), poleMat);
  pole.position.set(x, 2.75, z);
  scene.add(pole);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.2, 0.2), poleMat);
  head.position.set(x, 5.6, z);
  scene.add(head);
  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 5, 5),
    new THREE.MeshBasicMaterial({ color: 0xfff0c0 })
  );
  bulb.position.set(x, 5.4, z);
  scene.add(bulb);
  const light = new THREE.PointLight(0xfff0c0, 0.9, 14);
  light.position.set(x, 5.4, z);
  scene.add(light);
  return light;
}

function makeShadow(scene: THREE.Scene): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: 0x000000 });

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 6, 5), mat);
  head.position.y = 1.75;
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.25, 0.95, 6), mat);
  body.position.y = 1.15;
  const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.85, 4), mat);
  armL.rotation.z = 0.35; armL.position.set(-0.38, 1.15, 0);
  const armR = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.85, 4), mat);
  armR.rotation.z = -0.35; armR.position.set(0.38, 1.15, 0);
  const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.08, 0.95, 5), mat);
  legL.position.set(-0.16, 0.48, 0);
  const legR = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.08, 0.95, 5), mat);
  legR.position.set(0.16, 0.48, 0);

  g.add(head, body, armL, armR, legL, legR);
  g.position.set(0, 0, -8);
  scene.add(g);
  return g;
}

function buildWorld(scene: THREE.Scene) {
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(300, 300),
    new THREE.MeshLambertMaterial({ color: GRASS_COLOR })
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(7, 300),
    new THREE.MeshLambertMaterial({ color: ROAD_COLOR })
  );
  road.rotation.x = -Math.PI / 2;
  road.position.y = 0.01;
  scene.add(road);

  [-4.5, 4.5].forEach(sx => {
    const sw = new THREE.Mesh(
      new THREE.PlaneGeometry(1.5, 300),
      new THREE.MeshLambertMaterial({ color: SIDEWALK })
    );
    sw.rotation.x = -Math.PI / 2;
    sw.position.set(sx, 0.015, 0);
    scene.add(sw);
  });

  const dashMat = new THREE.MeshLambertMaterial({ color: 0xf0e8c0 });
  for (let z = -120; z < 120; z += 5) {
    const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 2.5), dashMat);
    dash.rotation.x = -Math.PI / 2;
    dash.position.set(0, 0.02, z);
    scene.add(dash);
  }

  const houseSide = (side: number) => {
    for (let z = -110; z < 110; z += randInt(10, 14)) {
      const hx = side * rand(6.5, 9);
      const rot = side > 0 ? -Math.PI / 2 : Math.PI / 2;
      makeHouse(scene, hx, z + rand(-1, 1), rot);
      makeTree(scene, hx + rand(-2, 2), z + rand(-4, -2));
      if (Math.random() > 0.4) makeTree(scene, hx + rand(-2, 2), z + rand(2, 4));
      makeFence(scene, side > 0 ? hx - 2.5 : hx - 3, z - 4, 6, 'z');
    }
  };
  houseSide(1);
  houseSide(-1);

  for (let z = -100; z < 100; z += 15) {
    makeLamp(scene, 5.8, z);
    makeLamp(scene, -5.8, z);
  }

  const benchMat = new THREE.MeshLambertMaterial({ color: 0x8a6040 });
  for (let z = -80; z < 80; z += 22) {
    [5.0, -5.0].forEach(bx => {
      const bench = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.12, 0.4), benchMat);
      bench.position.set(bx, 0.5, z);
      scene.add(bench);
      [-0.5, 0.5].forEach(lx => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.1), benchMat);
        leg.position.set(bx + lx, 0.25, z);
        scene.add(leg);
      });
    });
  }
}

// ─── Component ──────────────────────────────────────────────

const CityEngine = ({ onEntityContact, onHUDUpdate }: Props) => {
  const mountRef   = useRef<HTMLDivElement>(null);
  const rendRef    = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef   = useRef<THREE.Scene | null>(null);
  const camRef     = useRef<THREE.PerspectiveCamera | null>(null);
  const shadowRef  = useRef<THREE.Group | null>(null);
  const frameRef   = useRef(0);
  const keysRef    = useRef<Set<string>>(new Set());
  const yawRef     = useRef(0);
  const pitchRef   = useRef(0);
  const lockedRef  = useRef(false);
  const fpsRef     = useRef({ n: 0, last: performance.now() });
  const contactRef = useRef(false);
  const timeRef    = useRef(0);
  const bobRef     = useRef(0);

  const init = useCallback(() => {
    if (!mountRef.current) return;
    const W = mountRef.current.clientWidth;
    const H = mountRef.current.clientHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = false;
    renderer.setClearColor(SKY_COLOR);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    mountRef.current.appendChild(renderer.domElement);
    rendRef.current = renderer;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(SKY_COLOR);
    scene.fog = new THREE.Fog(FOG_COLOR, 20, 65);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(72, W / H, 0.1, 120);
    camera.position.set(0, 1.7, 0);
    camRef.current = camera;

    scene.add(new THREE.AmbientLight(0xfff0d0, 1.5));
    const sun = new THREE.DirectionalLight(0xffddb0, 1.0);
    sun.position.set(15, 30, 10);
    scene.add(sun);

    buildWorld(scene);
    shadowRef.current = makeShadow(scene);

    const onResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth, h = mountRef.current.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const setupControls = useCallback(() => {
    const down = (e: KeyboardEvent) => {
      keysRef.current.add(e.code);
      if (['KeyW','KeyS','KeyA','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))
        e.preventDefault();
    };
    const up = (e: KeyboardEvent) => keysRef.current.delete(e.code);
    const move = (e: MouseEvent) => {
      if (!lockedRef.current) return;
      yawRef.current  -= e.movementX * 0.0022;
      pitchRef.current = Math.max(-0.65, Math.min(0.65, pitchRef.current - e.movementY * 0.0022));
    };
    const lockChange = () => {
      lockedRef.current = document.pointerLockElement === mountRef.current?.querySelector('canvas');
    };
    const click = () => {
      const c = mountRef.current?.querySelector('canvas');
      if (c && !lockedRef.current) c.requestPointerLock();
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('mousemove', move);
    document.addEventListener('pointerlockchange', lockChange);
    mountRef.current?.addEventListener('click', click);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('mousemove', move);
      document.removeEventListener('pointerlockchange', lockChange);
    };
  }, []);

  const startLoop = useCallback(() => {
    const renderer = rendRef.current!;
    const scene    = sceneRef.current!;
    const camera   = camRef.current!;
    const shadow   = shadowRef.current!;

    const SHADOW_DIST  = 5.5;
    const SHADOW_SPEED = 0.018;

    const loop = () => {
      frameRef.current = requestAnimationFrame(loop);
      timeRef.current += 0.016;
      const t = timeRef.current;

      // FPS + HUD
      fpsRef.current.n++;
      const now = performance.now();
      if (now - fpsRef.current.last > 900) {
        const fps = Math.round(fpsRef.current.n / ((now - fpsRef.current.last) / 1000));
        fpsRef.current = { n: 0, last: now };
        const toShadow = new THREE.Vector3().subVectors(shadow.position, camera.position).normalize();
        const camFwd = new THREE.Vector3(); camera.getWorldDirection(camFwd);
        const dot = camFwd.dot(toShadow);
        const dist = camera.position.distanceTo(shadow.position);
        onHUDUpdate({ pos: camera.position.clone(), fps, shadowDist: dist, isLooking: dot > 0.45 });
      }

      // Movement
      const keys = keysRef.current;
      camera.quaternion.setFromEuler(new THREE.Euler(pitchRef.current, yawRef.current, 0, 'YXZ'));

      const fwd   = new THREE.Vector3(-Math.sin(yawRef.current), 0, -Math.cos(yawRef.current));
      const right = new THREE.Vector3(Math.cos(yawRef.current), 0, -Math.sin(yawRef.current));
      const mv    = new THREE.Vector3();

      const isMoving = keys.has('KeyW') || keys.has('KeyS') || keys.has('KeyA') || keys.has('KeyD')
        || keys.has('ArrowUp') || keys.has('ArrowDown') || keys.has('ArrowLeft') || keys.has('ArrowRight');

      const spd = 0.08;
      if (keys.has('KeyW') || keys.has('ArrowUp'))    mv.addScaledVector(fwd, spd);
      if (keys.has('KeyS') || keys.has('ArrowDown'))  mv.addScaledVector(fwd, -spd);
      if (keys.has('KeyA') || keys.has('ArrowLeft'))  mv.addScaledVector(right, -spd);
      if (keys.has('KeyD') || keys.has('ArrowRight')) mv.addScaledVector(right, spd);

      if (isMoving) {
        bobRef.current += 0.12;
        camera.position.y = 1.7 + Math.sin(bobRef.current) * 0.045;
      } else {
        camera.position.y += (1.7 - camera.position.y) * 0.12;
      }

      const next = camera.position.clone().add(mv);
      next.y = camera.position.y;
      next.x = Math.max(-11, Math.min(11, next.x));
      next.z = Math.max(-110, Math.min(110, next.z));
      camera.position.copy(next);

      // Shadow — always behind player
      const behindDir = new THREE.Vector3(Math.sin(yawRef.current), 0, Math.cos(yawRef.current));
      const targetPos = new THREE.Vector3(
        camera.position.x + behindDir.x * SHADOW_DIST,
        0,
        camera.position.z + behindDir.z * SHADOW_DIST
      );
      shadow.position.lerp(targetPos, SHADOW_SPEED + (isMoving ? 0.012 : 0));
      shadow.lookAt(camera.position.x, shadow.position.y + 1, camera.position.z);

      // Idle sway
      shadow.rotation.z = Math.sin(t * 0.6) * 0.03;

      // Limb walk animation
      const walkAmp = isMoving ? 0.35 : 0.05;
      const walkFreq = isMoving ? 2.4 : 0.5;
      shadow.children.forEach((child, i) => {
        if (i === 2 || i === 3) // arms
          child.rotation.x = Math.sin(t * walkFreq + i * Math.PI) * walkAmp;
        if (i === 4 || i === 5) // legs
          child.rotation.x = Math.sin(t * walkFreq + i * Math.PI + Math.PI) * walkAmp;
      });

      // Contact
      const d = camera.position.distanceTo(shadow.position);
      if (d < 2.2 && !contactRef.current) {
        contactRef.current = true;
        onEntityContact();
      }

      renderer.render(scene, camera);
    };
    loop();
  }, [onEntityContact, onHUDUpdate]);

  useEffect(() => {
    const cleanScene    = init();
    const cleanControls = setupControls();
    startLoop();
    return () => {
      cancelAnimationFrame(frameRef.current);
      cleanScene?.();
      cleanControls?.();
      const canvas = mountRef.current?.querySelector('canvas');
      if (canvas) mountRef.current?.removeChild(canvas);
      rendRef.current?.dispose();
      if (document.pointerLockElement) document.exitPointerLock();
    };
  }, [init, setupControls, startLoop]);

  return <div ref={mountRef} className="absolute inset-0" />;
};

export default CityEngine;
