import { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';

export interface HUDData {
  pos: THREE.Vector3;
  fps: number;
  shadowDist: number;
  isLooking: boolean;
  inLonelyHouse: boolean;
}

interface Props {
  onEntityContact: () => void;
  onHUDUpdate: (data: HUDData) => void;
  contactCount: number;
}

// ─── Palette ────────────────────────────────────────────────
const SKY_TOP    = 0x7a9abf;
const SKY_HOR    = 0xd4b896;
const FOG_COLOR  = 0xc8b090;
const ROAD_COLOR = 0x8a8070;
const SIDEWALK   = 0xb0a090;
const GRASS      = 0x8aaa60;
const WALLS      = [0xe8dcc8, 0xd4c8b0, 0xc8bca8, 0xdcd0bc, 0xe0d4be];
const ROOFS      = [0xa06040, 0x8a5030, 0xb07050, 0x784830, 0xc08060];
const FENCE_C    = 0xf0ead8;
const TRUNK_C    = 0x6a4020;
const LEAVES_C   = [0x6a9040, 0x5a8030, 0x789050, 0x4a7020];

function rand(a: number, b: number) { return Math.random() * (b - a) + a; }
function randInt(a: number, b: number) { return Math.floor(rand(a, b + 1)); }
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

// ─── Sky dome with surreal objects ─────────────────────────
function buildSky(scene: THREE.Scene) {
  // Sky dome gradient using vertex colors
  const skyGeo = new THREE.SphereGeometry(200, 16, 16);
  skyGeo.scale(-1, 1, 1); // invert
  const skyMat = new THREE.MeshBasicMaterial({ color: SKY_TOP, side: THREE.BackSide });
  scene.add(new THREE.Mesh(skyGeo, skyMat));

  // Horizon band
  const horizonGeo = new THREE.CylinderGeometry(195, 195, 60, 32, 1, true);
  const horizonMat = new THREE.MeshBasicMaterial({ color: SKY_HOR, side: THREE.BackSide, transparent: true, opacity: 0.6 });
  const horizon = new THREE.Mesh(horizonGeo, horizonMat);
  horizon.position.y = -20;
  scene.add(horizon);

  // ── Jupiter ──────────────────────────────────────────────
  const jupiterGroup = new THREE.Group();
  const jupGeo = new THREE.SphereGeometry(14, 24, 18);
  const jupMat = new THREE.MeshLambertMaterial({ color: 0xc8a06a });
  const jupiter = new THREE.Mesh(jupGeo, jupMat);
  jupiterGroup.add(jupiter);

  // Jupiter bands
  const bandColors = [0xb08040, 0xd4a870, 0xa07030, 0xe0b880, 0xc89050];
  for (let i = 0; i < 7; i++) {
    const lat = -0.9 + i * 0.3;
    const y = Math.sin(lat * Math.PI / 2) * 14;
    const r = Math.cos(lat * Math.PI / 2) * 14;
    const bandGeo = new THREE.TorusGeometry(r * 0.999, 0.9 + Math.random() * 1.2, 6, 32);
    const bandMat = new THREE.MeshLambertMaterial({ color: pick(bandColors) });
    const band = new THREE.Mesh(bandGeo, bandMat);
    band.position.y = y;
    band.rotation.x = Math.PI / 2;
    jupiterGroup.add(band);
  }

  // Great red spot
  const spotGeo = new THREE.SphereGeometry(2.5, 8, 6);
  const spotMat = new THREE.MeshLambertMaterial({ color: 0xc04020 });
  const spot = new THREE.Mesh(spotGeo, spotMat);
  spot.position.set(10, -2, 4);
  jupiterGroup.add(spot);

  // Jupiter rings
  const ringGeo = new THREE.TorusGeometry(20, 0.8, 4, 60);
  const ringMat = new THREE.MeshLambertMaterial({ color: 0xd4b070, transparent: true, opacity: 0.5 });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = Math.PI / 3;
  jupiterGroup.add(ring);

  jupiterGroup.position.set(-60, 80, -140);
  jupiterGroup.userData.isJupiter = true;
  scene.add(jupiterGroup);

  // ── Floating eyeball ─────────────────────────────────────
  const eyeGroup = new THREE.Group();
  const eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(4, 10, 10), new THREE.MeshLambertMaterial({ color: 0xf4f0e8 }));
  const iris = new THREE.Mesh(new THREE.SphereGeometry(2.2, 8, 8), new THREE.MeshLambertMaterial({ color: 0x4060c0 }));
  iris.position.z = 3.2;
  const pupil = new THREE.Mesh(new THREE.SphereGeometry(1.0, 6, 6), new THREE.MeshBasicMaterial({ color: 0x050510 }));
  pupil.position.z = 4.1;
  eyeGroup.add(eyeWhite, iris, pupil);
  eyeGroup.position.set(55, 45, -100);
  eyeGroup.userData.floatSeed = rand(0, Math.PI * 2);
  scene.add(eyeGroup);

  // ── Floating clock face ───────────────────────────────────
  const clockGroup = new THREE.Group();
  const clockFace = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 0.4, 12), new THREE.MeshLambertMaterial({ color: 0xf0e8d0 }));
  clockFace.rotation.x = Math.PI / 2;
  clockGroup.add(clockFace);
  // Melting drips
  for (let i = 0; i < 4; i++) {
    const drip = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.1, rand(1, 3), 5),
      new THREE.MeshLambertMaterial({ color: 0xe8dcc0 })
    );
    drip.position.set(rand(-3, 3), rand(-4, -2), 0.2);
    clockGroup.add(drip);
  }
  clockGroup.position.set(30, 35, -90);
  clockGroup.userData.floatSeed = rand(0, Math.PI * 2);
  scene.add(clockGroup);

  // ── Inverted pyramid ─────────────────────────────────────
  const pyrGeo = new THREE.ConeGeometry(8, 16, 4);
  const pyrMat = new THREE.MeshLambertMaterial({ color: 0xd4c4a0, wireframe: false });
  const pyr = new THREE.Mesh(pyrGeo, pyrMat);
  pyr.rotation.z = Math.PI; // upside down
  pyr.position.set(-90, 50, -120);
  pyr.userData.floatSeed = rand(0, Math.PI * 2);
  scene.add(pyr);

  // ── Moon with face ───────────────────────────────────────
  const moonGroup = new THREE.Group();
  const moonBody = new THREE.Mesh(new THREE.SphereGeometry(7, 12, 10), new THREE.MeshLambertMaterial({ color: 0xf0ead8 }));
  moonGroup.add(moonBody);
  // Face features
  [-2.5, 2.5].forEach(ex => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.6, 6, 6), new THREE.MeshBasicMaterial({ color: 0x303030 }));
    eye.position.set(ex, 1.5, 6.8);
    moonGroup.add(eye);
  });
  const mouthGeo = new THREE.TorusGeometry(2, 0.3, 5, 12, Math.PI);
  const mouth = new THREE.Mesh(mouthGeo, new THREE.MeshBasicMaterial({ color: 0x303030 }));
  mouth.position.set(0, -1.5, 6.5);
  mouth.rotation.z = Math.PI;
  moonGroup.add(mouth);
  moonGroup.position.set(100, 60, -150);
  moonGroup.userData.floatSeed = rand(0, Math.PI * 2);
  scene.add(moonGroup);

  // ── Floating number "̷̡̫̓4̵" ── visible billboard text planes
  const billboardMat = new THREE.MeshBasicMaterial({ color: 0xc04040, side: THREE.DoubleSide, transparent: true, opacity: 0.7 });
  [-40, 20, 70].forEach((bx, i) => {
    const b = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), billboardMat);
    b.position.set(bx, 30 + i * 10, -80 - i * 15);
    b.userData.floatSeed = rand(0, Math.PI * 2);
    scene.add(b);
  });

  return { jupiterGroup, eyeGroup, clockGroup };
}

// ─── House ──────────────────────────────────────────────────
function makeHouse(scene: THREE.Scene, x: number, z: number, rot = 0, color?: number) {
  const g = new THREE.Group();
  const W = rand(4, 6), H = rand(3, 4.5), D = rand(5, 7);
  const wallMat = new THREE.MeshLambertMaterial({ color: color ?? pick(WALLS) });
  const wall = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), wallMat);
  wall.position.y = H / 2; g.add(wall);
  const roofMat = new THREE.MeshLambertMaterial({ color: pick(ROOFS) });
  const roof = new THREE.Mesh(new THREE.ConeGeometry(W * 0.78, H * 0.7, 4), roofMat);
  roof.position.y = H + H * 0.35; roof.rotation.y = Math.PI / 4; g.add(roof);
  const doorMat = new THREE.MeshLambertMaterial({ color: 0x6a4020 });
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.6, 0.1), doorMat);
  door.position.set(0, 0.8, D / 2 + 0.05); g.add(door);
  const winMat = new THREE.MeshLambertMaterial({ color: 0xd4e8f0, emissive: 0x8ab0c0, emissiveIntensity: 0.3 });
  [-W * 0.28, W * 0.28].forEach(wx => {
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.7, 0.1), winMat);
    win.position.set(wx, H * 0.6, D / 2 + 0.05); g.add(win);
  });
  g.position.set(x, 0, z); g.rotation.y = rot;
  scene.add(g);
  return g;
}

function makeTree(scene: THREE.Scene, x: number, z: number) {
  const g = new THREE.Group();
  const h = rand(2.5, 4.5);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, h, 5), new THREE.MeshLambertMaterial({ color: TRUNK_C }));
  trunk.position.y = h / 2; g.add(trunk);
  const lh = rand(2, 3.5);
  const leaves = new THREE.Mesh(new THREE.ConeGeometry(rand(1, 1.8), lh, 5), new THREE.MeshLambertMaterial({ color: pick(LEAVES_C) }));
  leaves.position.y = h + lh * 0.45; g.add(leaves);
  g.position.set(x, 0, z); scene.add(g);
}

function makeFence(scene: THREE.Scene, x: number, z: number, length: number, axis: 'x' | 'z') {
  const mat = new THREE.MeshLambertMaterial({ color: FENCE_C });
  const count = Math.floor(length / 0.8);
  for (let i = 0; i < count; i++) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.9, 0.1), mat);
    post.position.set(axis === 'x' ? x + i * 0.8 : x, 0.45, axis === 'z' ? z + i * 0.8 : z);
    scene.add(post);
  }
  const rail = new THREE.Mesh(
    new THREE.BoxGeometry(axis === 'x' ? length : 0.06, 0.06, axis === 'z' ? length : 0.06), mat
  );
  rail.position.set(axis === 'x' ? x + length / 2 : x, 0.65, axis === 'z' ? z + length / 2 : z);
  scene.add(rail);
}

function makeLamp(scene: THREE.Scene, x: number, z: number) {
  const mat = new THREE.MeshLambertMaterial({ color: 0x707060 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 5.5, 6), mat);
  pole.position.set(x, 2.75, z); scene.add(pole);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.2, 0.2), mat);
  head.position.set(x, 5.6, z); scene.add(head);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 5, 5), new THREE.MeshBasicMaterial({ color: 0xfff0c0 }));
  bulb.position.set(x, 5.4, z); scene.add(bulb);
  const light = new THREE.PointLight(0xfff0c0, 0.9, 14);
  light.position.set(x, 5.4, z); scene.add(light);
}

// ─── Shadow entity ───────────────────────────────────────────
function makeShadow(scene: THREE.Scene, spawnPos: THREE.Vector3): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 6, 5), mat); head.position.y = 1.75;
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.25, 0.95, 6), mat); body.position.y = 1.15;
  const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.85, 4), mat); armL.rotation.z = 0.35; armL.position.set(-0.38, 1.15, 0);
  const armR = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.85, 4), mat); armR.rotation.z = -0.35; armR.position.set(0.38, 1.15, 0);
  const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.08, 0.95, 5), mat); legL.position.set(-0.16, 0.48, 0);
  const legR = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.08, 0.95, 5), mat); legR.position.set(0.16, 0.48, 0);
  g.add(head, body, armL, armR, legL, legR);
  g.position.copy(spawnPos);
  scene.add(g);
  return g;
}

// ─── Lonely house ────────────────────────────────────────────
function makeLonelyHouse(scene: THREE.Scene): { group: THREE.Group; pos: THREE.Vector3 } {
  const pos = new THREE.Vector3(0, 0, -90);
  const g = new THREE.Group();

  // House body — slightly different, more pale
  const wallMat = new THREE.MeshLambertMaterial({ color: 0xf0e8d8 });
  const wall = new THREE.Mesh(new THREE.BoxGeometry(7, 5, 8), wallMat);
  wall.position.y = 2.5; g.add(wall);

  const roofMat = new THREE.MeshLambertMaterial({ color: 0x907060 });
  const roof = new THREE.Mesh(new THREE.ConeGeometry(6, 4, 4), roofMat);
  roof.position.y = 6.5; roof.rotation.y = Math.PI / 4; g.add(roof);

  const doorMat = new THREE.MeshLambertMaterial({ color: 0x4a3010 });
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.2, 0.1), doorMat);
  door.position.set(0, 1.1, 4.05); g.add(door);

  // Warm window glow
  const winMat = new THREE.MeshLambertMaterial({ color: 0xffdd80, emissive: 0xffaa20, emissiveIntensity: 1.0 });
  [-2, 2].forEach(wx => {
    const win = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.9, 0.1), winMat);
    win.position.set(wx, 2.8, 4.05); g.add(win);
  });

  // Interior warm light
  const glow = new THREE.PointLight(0xffaa30, 2.5, 15);
  glow.position.set(0, 2, 0); g.add(glow);

  g.position.copy(pos);
  scene.add(g);
  return { group: g, pos };
}

// ─── Main world ──────────────────────────────────────────────
function buildWorld(scene: THREE.Scene) {
  // Ground
  scene.add(Object.assign(new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshLambertMaterial({ color: GRASS })), { rotation: { x: -Math.PI / 2, y: 0, z: 0 } }));

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshLambertMaterial({ color: GRASS }));
  ground.rotation.x = -Math.PI / 2;
  // remove duplicate
  scene.remove(scene.children[scene.children.length - 1]);

  // Road
  const road = new THREE.Mesh(new THREE.PlaneGeometry(7, 300), new THREE.MeshLambertMaterial({ color: ROAD_COLOR }));
  road.rotation.x = -Math.PI / 2; road.position.y = 0.01;
  scene.add(road);

  [-4.5, 4.5].forEach(sx => {
    const sw = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 300), new THREE.MeshLambertMaterial({ color: SIDEWALK }));
    sw.rotation.x = -Math.PI / 2; sw.position.set(sx, 0.015, 0);
    scene.add(sw);
  });

  for (let z = -120; z < 120; z += 5) {
    const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 2.5), new THREE.MeshLambertMaterial({ color: 0xf0e8c0 }));
    dash.rotation.x = -Math.PI / 2; dash.position.set(0, 0.02, z);
    scene.add(dash);
  }

  const houseSide = (side: number) => {
    for (let z = -70; z < 70; z += randInt(10, 14)) {
      const hx = side * rand(6.5, 9);
      makeHouse(scene, hx, z + rand(-1, 1), side > 0 ? -Math.PI / 2 : Math.PI / 2);
      makeTree(scene, hx + rand(-2, 2), z + rand(-4, -2));
      if (Math.random() > 0.4) makeTree(scene, hx + rand(-2, 2), z + rand(2, 4));
      makeFence(scene, side > 0 ? hx - 2.5 : hx - 3, z - 4, 6, 'z');
    }
  };
  houseSide(1); houseSide(-1);

  for (let z = -80; z < 80; z += 15) { makeLamp(scene, 5.8, z); makeLamp(scene, -5.8, z); }

  const benchMat = new THREE.MeshLambertMaterial({ color: 0x8a6040 });
  for (let z = -60; z < 60; z += 22) {
    [5.0, -5.0].forEach(bx => {
      const bench = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.12, 0.4), benchMat);
      bench.position.set(bx, 0.5, z); scene.add(bench);
      [-0.5, 0.5].forEach(lx => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.1), benchMat);
        leg.position.set(bx + lx, 0.25, z); scene.add(leg);
      });
    });
  }
}

// ─── Component ───────────────────────────────────────────────
const CityEngine = ({ onEntityContact, onHUDUpdate, contactCount }: Props) => {
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
  const lonelyPosRef = useRef(new THREE.Vector3(0, 0, -90));
  const skyObjectsRef = useRef<{ jupiterGroup: THREE.Group; eyeGroup: THREE.Group; clockGroup: THREE.Group } | null>(null);

  // Shadow spawn at entrance of a house
  const SHADOW_SPAWN = new THREE.Vector3(8, 0, -20);
  const contactCountRef = useRef(contactCount);
  useEffect(() => { contactCountRef.current = contactCount; }, [contactCount]);

  const init = useCallback(() => {
    if (!mountRef.current) return;
    const W = mountRef.current.clientWidth, H = mountRef.current.clientHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    mountRef.current.appendChild(renderer.domElement);
    rendRef.current = renderer;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(FOG_COLOR, 25, 75);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(72, W / H, 0.1, 400);
    camera.position.set(0, 1.7, 0);
    camRef.current = camera;

    scene.add(new THREE.AmbientLight(0xfff0d0, 1.5));
    const sun = new THREE.DirectionalLight(0xffddb0, 1.0);
    sun.position.set(15, 30, 10); scene.add(sun);

    // Ground (no duplicate)
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshLambertMaterial({ color: GRASS }));
    ground.rotation.x = -Math.PI / 2; scene.add(ground);

    const road = new THREE.Mesh(new THREE.PlaneGeometry(7, 300), new THREE.MeshLambertMaterial({ color: ROAD_COLOR }));
    road.rotation.x = -Math.PI / 2; road.position.y = 0.01; scene.add(road);
    [-4.5, 4.5].forEach(sx => {
      const sw = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 300), new THREE.MeshLambertMaterial({ color: SIDEWALK }));
      sw.rotation.x = -Math.PI / 2; sw.position.set(sx, 0.015, 0); scene.add(sw);
    });
    for (let z = -120; z < 120; z += 5) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 2.5), new THREE.MeshLambertMaterial({ color: 0xf0e8c0 }));
      dash.rotation.x = -Math.PI / 2; dash.position.set(0, 0.02, z); scene.add(dash);
    }

    const houseSide = (side: number) => {
      for (let z = -70; z < 70; z += randInt(10, 14)) {
        const hx = side * rand(6.5, 9);
        makeHouse(scene, hx, z + rand(-1, 1), side > 0 ? -Math.PI / 2 : Math.PI / 2);
        makeTree(scene, hx + rand(-2, 2), z + rand(-4, -2));
        if (Math.random() > 0.4) makeTree(scene, hx + rand(-2, 2), z + rand(2, 4));
        makeFence(scene, side > 0 ? hx - 2.5 : hx - 3, z - 4, 6, 'z');
      }
    };
    houseSide(1); houseSide(-1);
    for (let z = -80; z < 80; z += 15) { makeLamp(scene, 5.8, z); makeLamp(scene, -5.8, z); }

    const benchMat = new THREE.MeshLambertMaterial({ color: 0x8a6040 });
    for (let z = -60; z < 60; z += 22) {
      [5.0, -5.0].forEach(bx => {
        const bench = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.12, 0.4), benchMat);
        bench.position.set(bx, 0.5, z); scene.add(bench);
        [-0.5, 0.5].forEach(lx => {
          const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.1), benchMat);
          leg.position.set(bx + lx, 0.25, z); scene.add(leg);
        });
      });
    }

    makeLonelyHouse(scene);
    skyObjectsRef.current = buildSky(scene);
    shadowRef.current = makeShadow(scene, SHADOW_SPAWN.clone());

    const onResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth, h = mountRef.current.clientHeight;
      renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
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

    const loop = () => {
      frameRef.current = requestAnimationFrame(loop);
      timeRef.current += 0.016;
      const t = timeRef.current;

      // FPS / HUD update
      fpsRef.current.n++;
      const now = performance.now();
      if (now - fpsRef.current.last > 900) {
        const fps = Math.round(fpsRef.current.n / ((now - fpsRef.current.last) / 1000));
        fpsRef.current = { n: 0, last: now };
        const toShadow = new THREE.Vector3().subVectors(shadow.position, camera.position).normalize();
        const camFwd = new THREE.Vector3(); camera.getWorldDirection(camFwd);
        const dist = camera.position.distanceTo(shadow.position);
        const isLooking = camFwd.dot(toShadow) > 0.45;
        const inLonelyHouse = camera.position.distanceTo(lonelyPosRef.current) < 5.5;
        onHUDUpdate({ pos: camera.position.clone(), fps, shadowDist: dist, isLooking, inLonelyHouse });
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

      if (isMoving) { bobRef.current += 0.12; camera.position.y = 1.7 + Math.sin(bobRef.current) * 0.045; }
      else camera.position.y += (1.7 - camera.position.y) * 0.12;

      const next = camera.position.clone().add(mv);
      next.y = camera.position.y;
      next.x = Math.max(-11, Math.min(11, next.x));
      next.z = Math.max(-110, Math.min(110, next.z));
      camera.position.copy(next);

      // ── Shadow behaviour by contact count ─────────────────
      const cc = contactCountRef.current;
      // Base chase speed increases with contact count
      const chaseSpeed = 0.004 + cc * 0.004; // 0.004 → 0.04 at 10 encounters
      // Shadow walks toward player (not behind anymore)
      const toPlayer = new THREE.Vector3().subVectors(camera.position, shadow.position);
      toPlayer.y = 0;
      const distToPlayer = toPlayer.length();
      if (distToPlayer > 0.5) {
        toPlayer.normalize().multiplyScalar(chaseSpeed);
        shadow.position.add(toPlayer);
      }
      shadow.position.y = 0;
      shadow.lookAt(camera.position.x, 1, camera.position.z);

      // Limb walk animation, more frantic at high counts
      const walkFreq = 1.5 + cc * 0.3;
      const walkAmp  = 0.2 + cc * 0.04;
      shadow.children.forEach((child, i) => {
        if (i === 2 || i === 3) child.rotation.x = Math.sin(t * walkFreq + i * Math.PI) * walkAmp;
        if (i === 4 || i === 5) child.rotation.x = Math.sin(t * walkFreq + i * Math.PI + Math.PI) * walkAmp;
      });
      // Idle sway
      shadow.rotation.z = Math.sin(t * 0.6 + cc) * 0.03;

      // Contact
      const d = camera.position.distanceTo(shadow.position);
      if (d < 2.0 && !contactRef.current) {
        contactRef.current = true;
        onEntityContact();
        setTimeout(() => { contactRef.current = false; }, 3000);
      }

      // ── Animate sky objects ───────────────────────────────
      if (skyObjectsRef.current) {
        const { jupiterGroup, eyeGroup, clockGroup } = skyObjectsRef.current;
        jupiterGroup.rotation.y = t * 0.02;
        eyeGroup.position.y = 45 + Math.sin(t * 0.4 + (eyeGroup.userData.floatSeed as number)) * 3;
        eyeGroup.rotation.y = t * 0.15;
        clockGroup.position.y = 35 + Math.sin(t * 0.3 + (clockGroup.userData.floatSeed as number)) * 2;
        clockGroup.rotation.z = t * 0.05;
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
