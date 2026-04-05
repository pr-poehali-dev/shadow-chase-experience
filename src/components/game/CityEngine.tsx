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

// ─── Palette ─────────────────────────────────────────────────
const SKY_BLUE   = 0x87ceeb;
const FOG_COLOR  = 0xd4e8f0;
const ROAD_COLOR = 0x8a8070;
const SIDEWALK   = 0xb0a090;
const GRASS      = 0x7db85a;
const WALLS      = [0xe8dcc8, 0xd4c8b0, 0xc8bca8, 0xdcd0bc, 0xe0d4be, 0xf0e4d0];
const ROOFS      = [0xa06040, 0x8a5030, 0xb07050, 0x784830, 0xc08060, 0x906050];
const FENCE_C    = 0xf5f0e8;
const TRUNK_C    = 0x6a4020;
const LEAVES_C   = [0x5a9030, 0x4a8020, 0x6aaa40, 0x3a7010, 0x70b050];

function rand(a: number, b: number) { return Math.random() * (b - a) + a; }
function randInt(a: number, b: number) { return Math.floor(rand(a, b + 1)); }
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

// ─── Sky: bright daytime with surreal objects ─────────────────
function buildSky(scene: THREE.Scene) {
  // Bright blue sky sphere
  const skyGeo = new THREE.SphereGeometry(350, 32, 24);
  const skyMat = new THREE.MeshBasicMaterial({ color: SKY_BLUE, side: THREE.BackSide });
  scene.add(new THREE.Mesh(skyGeo, skyMat));

  // Sun
  const sunGroup = new THREE.Group();
  const sunCore = new THREE.Mesh(new THREE.SphereGeometry(6, 16, 16), new THREE.MeshBasicMaterial({ color: 0xffee88 }));
  sunGroup.add(sunCore);
  // Sun rays
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const ray = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.1, rand(4, 9), 5),
      new THREE.MeshBasicMaterial({ color: 0xffdd44, transparent: true, opacity: 0.7 })
    );
    ray.position.set(Math.cos(angle) * 9, Math.sin(angle) * 9, 0);
    ray.rotation.z = angle + Math.PI / 2;
    sunGroup.add(ray);
  }
  sunGroup.position.set(80, 130, -200);
  sunGroup.userData.isSun = true;
  scene.add(sunGroup);

  // ── Jupiter (very detailed) ──────────────────────────────
  const jupiterGroup = new THREE.Group();

  // Main body
  const jupGeo = new THREE.SphereGeometry(18, 32, 24);
  const jupMat = new THREE.MeshPhongMaterial({ color: 0xc8a06a, shininess: 15 });
  const jupiter = new THREE.Mesh(jupGeo, jupMat);
  jupiterGroup.add(jupiter);

  // Atmospheric bands — many thin rings around sphere
  const bandColors = [0xb08040, 0xd4a870, 0x9a6020, 0xe0b880, 0xc89050, 0xa87030, 0xdab060, 0x906018];
  for (let i = 0; i < 14; i++) {
    const lat = -1.1 + i * 0.16;
    const y = Math.sin(lat) * 17.5;
    const r = Math.sqrt(Math.max(0, 17.5 * 17.5 - y * y));
    if (r < 0.5) continue;
    const thickness = 0.6 + Math.random() * 1.0;
    const bandGeo = new THREE.TorusGeometry(r, thickness, 8, 48);
    const bandMat = new THREE.MeshPhongMaterial({ color: pick(bandColors), shininess: 5 });
    const band = new THREE.Mesh(bandGeo, bandMat);
    band.position.y = y;
    band.rotation.x = Math.PI / 2;
    jupiterGroup.add(band);
  }

  // Great Red Spot — oval storm
  const spotGroup = new THREE.Group();
  const spotBase = new THREE.Mesh(new THREE.SphereGeometry(3.5, 12, 8), new THREE.MeshPhongMaterial({ color: 0xc03818 }));
  spotGroup.add(spotBase);
  // Swirl rings around GRS
  for (let s = 0; s < 3; s++) {
    const swirlR = 4 + s * 1.5;
    const swirl = new THREE.Mesh(
      new THREE.TorusGeometry(swirlR, 0.25, 5, 20),
      new THREE.MeshPhongMaterial({ color: 0xd04828, transparent: true, opacity: 0.5 - s * 0.12 })
    );
    spotGroup.add(swirl);
  }
  spotGroup.position.set(14, -3, 6);
  spotGroup.scale.set(1, 0.55, 1);
  jupiterGroup.add(spotGroup);

  // Rings of Jupiter (3 rings, tilted)
  const ringColors = [0xd4b878, 0xc4a860, 0xe0c888];
  [22, 26, 28.5].forEach((rr, i) => {
    const ringGeo = new THREE.TorusGeometry(rr, 0.4 + i * 0.15, 6, 80);
    const ringMat = new THREE.MeshPhongMaterial({ color: ringColors[i], transparent: true, opacity: 0.45 - i * 0.08 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2.8 + i * 0.05;
    jupiterGroup.add(ring);
  });

  // Small moon orbiting Jupiter
  const moonSmall = new THREE.Mesh(new THREE.SphereGeometry(2.5, 10, 8), new THREE.MeshPhongMaterial({ color: 0xd0c8b0 }));
  moonSmall.position.set(32, 5, 0);
  moonSmall.userData.isMoon = true;
  jupiterGroup.add(moonSmall);

  jupiterGroup.position.set(-80, 95, -200);
  jupiterGroup.userData.isJupiter = true;
  scene.add(jupiterGroup);

  // ── Giant floating eyeball (very detailed) ─────────────
  const eyeGroup = new THREE.Group();

  const sclera = new THREE.Mesh(new THREE.SphereGeometry(5.5, 20, 18), new THREE.MeshPhongMaterial({ color: 0xf8f4ee, shininess: 80 }));
  eyeGroup.add(sclera);

  // Blood vessels (red lines on sclera)
  for (let v = 0; v < 6; v++) {
    const vesselPoints = [];
    let theta = rand(0, Math.PI * 2), phi = rand(0.4, 1.1);
    for (let p = 0; p < 8; p++) {
      theta += rand(-0.3, 0.3);
      phi   += rand(-0.15, 0.15);
      phi    = Math.max(0.2, Math.min(1.4, phi));
      vesselPoints.push(new THREE.Vector3(
        5.52 * Math.sin(phi) * Math.cos(theta),
        5.52 * Math.cos(phi),
        5.52 * Math.sin(phi) * Math.sin(theta)
      ));
    }
    const vGeo = new THREE.BufferGeometry().setFromPoints(vesselPoints);
    const vMat = new THREE.LineBasicMaterial({ color: 0xcc3030, linewidth: 1.5 });
    eyeGroup.add(new THREE.Line(vGeo, vMat));
  }

  // Iris (layered)
  const iris = new THREE.Mesh(new THREE.SphereGeometry(3.0, 16, 12), new THREE.MeshPhongMaterial({ color: 0x3050b0, shininess: 60 }));
  iris.position.z = 4.5;
  iris.scale.z = 0.18;
  eyeGroup.add(iris);

  // Iris detail ring
  const irisRing = new THREE.Mesh(new THREE.TorusGeometry(1.8, 0.5, 6, 20), new THREE.MeshPhongMaterial({ color: 0x2040a0, transparent: true, opacity: 0.6 }));
  irisRing.position.z = 4.6;
  eyeGroup.add(irisRing);

  // Pupil
  const pupil = new THREE.Mesh(new THREE.SphereGeometry(1.3, 10, 8), new THREE.MeshBasicMaterial({ color: 0x020208 }));
  pupil.position.z = 4.9;
  eyeGroup.add(pupil);

  // Specular highlight
  const highlight = new THREE.Mesh(new THREE.SphereGeometry(0.4, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  highlight.position.set(0.8, 0.8, 5.3);
  eyeGroup.add(highlight);

  // Eyelids (top and bottom)
  const lidMat = new THREE.MeshPhongMaterial({ color: 0xe8d8c0, shininess: 20 });
  const topLid = new THREE.Mesh(new THREE.SphereGeometry(5.6, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.45), lidMat);
  topLid.position.z = -0.3;
  topLid.rotation.x = -0.15;
  eyeGroup.add(topLid);

  eyeGroup.position.set(65, 52, -130);
  eyeGroup.userData.floatSeed = rand(0, Math.PI * 2);
  scene.add(eyeGroup);

  // ── Melting clock (Dalí-style) ────────────────────────────
  const clockGroup = new THREE.Group();

  const clockFace = new THREE.Mesh(
    new THREE.CylinderGeometry(6, 6, 0.5, 16),
    new THREE.MeshPhongMaterial({ color: 0xf0e8d0, shininess: 30 })
  );
  clockFace.rotation.x = Math.PI / 2;
  clockGroup.add(clockFace);

  // Clock edge ring
  const rimGeo = new THREE.TorusGeometry(6, 0.25, 8, 32);
  const rimMat = new THREE.MeshPhongMaterial({ color: 0xc8a860, shininess: 60 });
  clockGroup.add(new THREE.Mesh(rimGeo, rimMat));

  // Hour markers
  for (let h = 0; h < 12; h++) {
    const angle = (h / 12) * Math.PI * 2 - Math.PI / 2;
    const marker = new THREE.Mesh(
      new THREE.BoxGeometry(0.25, 0.8, 0.2),
      new THREE.MeshPhongMaterial({ color: 0x403020 })
    );
    marker.position.set(Math.cos(angle) * 5, Math.sin(angle) * 5, 0.35);
    marker.rotation.z = angle;
    clockGroup.add(marker);
  }

  // Clock hands
  const handMat = new THREE.MeshPhongMaterial({ color: 0x302010 });
  const hourHand = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3.5, 0.2), handMat);
  hourHand.position.set(0.8, 0.5, 0.4);
  hourHand.rotation.z = -0.8;
  clockGroup.add(hourHand);

  const minHand = new THREE.Mesh(new THREE.BoxGeometry(0.15, 5, 0.2), handMat);
  minHand.position.set(-1, 1.5, 0.4);
  minHand.rotation.z = 1.2;
  clockGroup.add(minHand);

  // Melting drips — longer and more curved
  for (let d = 0; d < 6; d++) {
    const dripLen = rand(2, 6);
    const drip = new THREE.Mesh(
      new THREE.CylinderGeometry(rand(0.15, 0.35), 0.05, dripLen, 6),
      new THREE.MeshPhongMaterial({ color: 0xe8dcc0, shininess: 20 })
    );
    const ang = rand(-Math.PI * 0.6, Math.PI * 0.6);
    drip.position.set(rand(-4.5, 4.5), -3.5 - dripLen * 0.4, rand(-0.2, 0.2));
    drip.rotation.x = rand(0.1, 0.4);
    drip.rotation.z = rand(-0.3, 0.3);
    clockGroup.add(drip);
  }

  clockGroup.position.set(45, 40, -110);
  clockGroup.userData.floatSeed = rand(0, Math.PI * 2);
  scene.add(clockGroup);

  // ── Inverted pyramid ──────────────────────────────────────
  const pyrGroup = new THREE.Group();
  const pyrMat = new THREE.MeshPhongMaterial({ color: 0xd4c4a0, shininess: 20 });
  const pyr = new THREE.Mesh(new THREE.ConeGeometry(10, 20, 4), pyrMat);
  pyr.rotation.z = Math.PI;
  pyrGroup.add(pyr);
  // Lines on pyramid faces
  const edgeMat = new THREE.LineBasicMaterial({ color: 0xa09060 });
  for (let e = 1; e < 5; e++) {
    const t = e / 5;
    const w = 10 * t;
    const pts = [
      new THREE.Vector3(-w, -20 * t + 10, w),
      new THREE.Vector3(w, -20 * t + 10, w),
      new THREE.Vector3(w, -20 * t + 10, -w),
      new THREE.Vector3(-w, -20 * t + 10, -w),
      new THREE.Vector3(-w, -20 * t + 10, w),
    ];
    pyrGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), edgeMat));
  }
  pyrGroup.position.set(-100, 60, -160);
  pyrGroup.userData.floatSeed = rand(0, Math.PI * 2);
  scene.add(pyrGroup);

  // ── Moon with face ──────────────────────────────────────
  const moonGroup = new THREE.Group();
  const moonBody = new THREE.Mesh(new THREE.SphereGeometry(9, 20, 16), new THREE.MeshPhongMaterial({ color: 0xf0ead8, shininess: 10 }));
  moonGroup.add(moonBody);
  // Craters
  for (let c = 0; c < 8; c++) {
    const cAngle = rand(0, Math.PI * 2), cPhi = rand(0.3, 2.5);
    const crater = new THREE.Mesh(
      new THREE.CircleGeometry(rand(0.5, 1.8), 8),
      new THREE.MeshPhongMaterial({ color: 0xd8d0c0, shininess: 5 })
    );
    crater.position.set(
      9.05 * Math.sin(cPhi) * Math.cos(cAngle),
      9.05 * Math.cos(cPhi),
      9.05 * Math.sin(cPhi) * Math.sin(cAngle)
    );
    crater.lookAt(crater.position.clone().multiplyScalar(2));
    moonGroup.add(crater);
  }
  // Eyes
  const eyeMatM = new THREE.MeshPhongMaterial({ color: 0x202020 });
  [-3, 3].forEach(ex => {
    const eyeM = new THREE.Mesh(new THREE.SphereGeometry(0.9, 8, 8), eyeMatM);
    eyeM.position.set(ex, 2, 8.5);
    moonGroup.add(eyeM);
    const pupilM = new THREE.Mesh(new THREE.SphereGeometry(0.45, 6, 6), new THREE.MeshBasicMaterial({ color: 0x000000 }));
    pupilM.position.set(ex, 2, 9.1);
    moonGroup.add(pupilM);
  });
  // Sad mouth
  const mouthCurve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(-2.5, -1.5, 8.5),
    new THREE.Vector3(0, -3.2, 9),
    new THREE.Vector3(2.5, -1.5, 8.5)
  );
  const mouthPts = mouthCurve.getPoints(12);
  moonGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(mouthPts), new THREE.LineBasicMaterial({ color: 0x303030, linewidth: 2 })));

  moonGroup.position.set(110, 70, -180);
  moonGroup.userData.floatSeed = rand(0, Math.PI * 2);
  scene.add(moonGroup);

  // ── Clouds (simple daytime fluffy shapes) ─────────────────
  for (let c = 0; c < 12; c++) {
    const cloudGroup = new THREE.Group();
    const cloudMat = new THREE.MeshPhongMaterial({ color: 0xffffff, transparent: true, opacity: 0.88 });
    const numPuffs = randInt(3, 6);
    for (let p = 0; p < numPuffs; p++) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(rand(3, 7), 10, 8), cloudMat);
      puff.position.set(rand(-8, 8), rand(-2, 3), rand(-4, 4));
      cloudGroup.add(puff);
    }
    cloudGroup.position.set(rand(-200, 200), rand(30, 70), rand(-200, 200));
    cloudGroup.userData.cloudSpeed = rand(0.005, 0.02);
    scene.add(cloudGroup);
  }

  return { jupiterGroup, eyeGroup, clockGroup, sunGroup, moonGroup, pyrGroup };
}

// ─── House ───────────────────────────────────────────────────
function makeHouse(scene: THREE.Scene, x: number, z: number, rot = 0) {
  const g = new THREE.Group();
  const W = rand(4, 6.5), H = rand(3.5, 5), D = rand(5, 7.5);

  // Foundation
  const foundMat = new THREE.MeshLambertMaterial({ color: 0xc0b090 });
  const found = new THREE.Mesh(new THREE.BoxGeometry(W + 0.4, 0.4, D + 0.4), foundMat);
  found.position.y = 0.2; g.add(found);

  const wallMat = new THREE.MeshLambertMaterial({ color: pick(WALLS) });
  const wall = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), wallMat);
  wall.position.y = H / 2 + 0.4; g.add(wall);

  // Roof with overhang
  const roofMat = new THREE.MeshLambertMaterial({ color: pick(ROOFS) });
  const roof = new THREE.Mesh(new THREE.ConeGeometry((W + 0.6) * 0.75, H * 0.7, 4), roofMat);
  roof.position.y = H + 0.4 + H * 0.35; roof.rotation.y = Math.PI / 4; g.add(roof);

  // Door with frame
  const doorMat = new THREE.MeshLambertMaterial({ color: 0x5a3210 });
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.9, 0.12), doorMat);
  door.position.set(0, 1.35 + 0.4, D / 2 + 0.12); g.add(door);
  const frameMat = new THREE.MeshLambertMaterial({ color: 0xf0ead8 });
  const frameTop = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.12, 0.12), frameMat);
  frameTop.position.set(0, 2.35 + 0.4, D / 2 + 0.12); g.add(frameTop);
  [-0.48, 0.48].forEach(fx => {
    const frameSide = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.9, 0.1), frameMat);
    frameSide.position.set(fx, 1.35 + 0.4, D / 2 + 0.1); g.add(frameSide);
  });

  // Windows with frames and cross
  const winMat = new THREE.MeshLambertMaterial({ color: 0xc8dcea, emissive: 0x6090a0, emissiveIntensity: 0.25 });
  [-W * 0.28, W * 0.28].forEach(wx => {
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.85, 0.08), winMat);
    win.position.set(wx, H * 0.6 + 0.4, D / 2 + 0.08); g.add(win);
    // Window cross
    const cross1 = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.06, 0.05), frameMat);
    cross1.position.set(wx, H * 0.6 + 0.4, D / 2 + 0.13); g.add(cross1);
    const cross2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.85, 0.05), frameMat);
    cross2.position.set(wx, H * 0.6 + 0.4, D / 2 + 0.13); g.add(cross2);
    // Window frame border
    const wframe = new THREE.Mesh(new THREE.BoxGeometry(1.05, 1.0, 0.07), frameMat);
    wframe.position.set(wx, H * 0.6 + 0.4, D / 2 + 0.04); g.add(wframe);
  });

  // Chimney
  if (Math.random() > 0.4) {
    const chimMat = new THREE.MeshLambertMaterial({ color: 0x904030 });
    const chim = new THREE.Mesh(new THREE.BoxGeometry(0.6, H * 0.5, 0.6), chimMat);
    chim.position.set(W * 0.25, H + 0.4 + H * 0.25, D * 0.2); g.add(chim);
  }

  // Steps
  const stepMat = new THREE.MeshLambertMaterial({ color: 0xc0b090 });
  const step = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.18, 0.5), stepMat);
  step.position.set(0, 0.09, D / 2 + 0.35); g.add(step);

  g.position.set(x, 0, z); g.rotation.y = rot;
  scene.add(g);
  return g;
}

function makeTree(scene: THREE.Scene, x: number, z: number) {
  const g = new THREE.Group();
  const h = rand(3, 5.5);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.22, h, 7), new THREE.MeshLambertMaterial({ color: TRUNK_C }));
  trunk.position.y = h / 2; g.add(trunk);
  // Multiple leaf layers
  const numLayers = randInt(2, 4);
  for (let l = 0; l < numLayers; l++) {
    const lh = rand(1.8, 3.5);
    const lr = rand(0.9, 2.0) * (1 - l * 0.15);
    const leaves = new THREE.Mesh(new THREE.ConeGeometry(lr, lh, 7), new THREE.MeshLambertMaterial({ color: pick(LEAVES_C) }));
    leaves.position.y = h + lh * 0.45 - l * 1.2; g.add(leaves);
  }
  g.position.set(x, 0, z); scene.add(g);
}

function makeFence(scene: THREE.Scene, x: number, z: number, length: number, axis: 'x' | 'z') {
  const mat = new THREE.MeshLambertMaterial({ color: FENCE_C });
  const count = Math.floor(length / 0.8);
  for (let i = 0; i < count; i++) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.0, 0.1), mat);
    // Pointed top
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.25, 4), mat);
    tip.position.y = 0.62;
    const postG = new THREE.Group();
    postG.add(post, tip);
    postG.position.set(axis === 'x' ? x + i * 0.8 : x, 0.5, axis === 'z' ? z + i * 0.8 : z);
    scene.add(postG);
  }
  const rail1 = new THREE.Mesh(new THREE.BoxGeometry(axis === 'x' ? length : 0.07, 0.07, axis === 'z' ? length : 0.07), mat);
  rail1.position.set(axis === 'x' ? x + length / 2 : x, 0.75, axis === 'z' ? z + length / 2 : z);
  scene.add(rail1);
  const rail2 = rail1.clone();
  rail2.position.y = 0.35;
  scene.add(rail2);
}

function makeLamp(scene: THREE.Scene, x: number, z: number) {
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x606050 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 6, 8), poleMat);
  pole.position.set(x, 3, z); scene.add(pole);
  // Curved arm
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.2, 6), poleMat);
  arm.rotation.z = Math.PI / 2; arm.position.set(x + 0.6, 6.1, z); scene.add(arm);
  // Lamp head
  const lampHead = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.25, 0.4, 8), poleMat);
  lampHead.position.set(x + 1.2, 5.9, z); scene.add(lampHead);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), new THREE.MeshBasicMaterial({ color: 0xfff8e0 }));
  bulb.position.set(x + 1.2, 5.7, z); scene.add(bulb);
  const light = new THREE.PointLight(0xfff0c0, 0.5, 10);
  light.position.set(x + 1.2, 5.7, z); scene.add(light);
}

// ─── Shadow entity — guaranteed to appear ────────────────────
function makeShadow(scene: THREE.Scene, spawnPos: THREE.Vector3): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: 0x050508 });

  // Head with slight detail
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 7), mat);
  head.position.y = 1.82;
  // Neck
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.25, 6), mat);
  neck.position.y = 1.55;
  // Torso
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.22, 0.85, 7), mat);
  torso.position.y = 1.1;
  // Hips
  const hips = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.2, 0.3, 6), mat);
  hips.position.y = 0.65;
  // Arms
  const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.9, 5), mat);
  armL.rotation.z = 0.4; armL.position.set(-0.42, 1.1, 0);
  const armR = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.9, 5), mat);
  armR.rotation.z = -0.4; armR.position.set(0.42, 1.1, 0);
  // Legs
  const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.09, 1.0, 6), mat);
  legL.position.set(-0.18, 0.5, 0);
  const legR = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.09, 1.0, 6), mat);
  legR.position.set(0.18, 0.5, 0);
  // Feet
  const footL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.3), mat);
  footL.position.set(-0.18, 0.06, 0.06);
  const footR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.3), mat);
  footR.position.set(0.18, 0.06, 0.06);

  g.add(head, neck, torso, hips, armL, armR, legL, legR, footL, footR);
  g.position.copy(spawnPos);
  g.position.y = 0;
  scene.add(g);
  return g;
}

// ─── Lonely house ─────────────────────────────────────────────
const LONELY_HOUSE_POS = new THREE.Vector3(0, 0, -95);

function makeLonelyHouse(scene: THREE.Scene) {
  const g = new THREE.Group();

  const wallMat = new THREE.MeshLambertMaterial({ color: 0xf4eee0 });
  const wall = new THREE.Mesh(new THREE.BoxGeometry(8, 5.5, 9), wallMat);
  wall.position.y = 2.75 + 0.4; g.add(wall);

  const found = new THREE.Mesh(new THREE.BoxGeometry(8.4, 0.4, 9.4), new THREE.MeshLambertMaterial({ color: 0xc8b890 }));
  found.position.y = 0.2; g.add(found);

  const roofMat = new THREE.MeshLambertMaterial({ color: 0x8a6050 });
  const roof = new THREE.Mesh(new THREE.ConeGeometry(6.5, 4.5, 4), roofMat);
  roof.position.y = 7.5; roof.rotation.y = Math.PI / 4; g.add(roof);

  const doorMat = new THREE.MeshLambertMaterial({ color: 0x3a2008 });
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.4, 0.12), doorMat);
  door.position.set(0, 1.6 + 0.4, 4.56); g.add(door);

  const winMat = new THREE.MeshLambertMaterial({ color: 0xffdd80, emissive: 0xffaa20, emissiveIntensity: 1.2 });
  [-2.4, 2.4].forEach(wx => {
    const win = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.1, 0.08), winMat);
    win.position.set(wx, 3.2 + 0.4, 4.56); g.add(win);
    const cross1 = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.07, 0.06), new THREE.MeshLambertMaterial({ color: 0xf0ead8 }));
    cross1.position.set(wx, 3.2 + 0.4, 4.62); g.add(cross1);
    const cross2 = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.1, 0.06), new THREE.MeshLambertMaterial({ color: 0xf0ead8 }));
    cross2.position.set(wx, 3.2 + 0.4, 4.62); g.add(cross2);
  });

  const glow = new THREE.PointLight(0xffaa30, 3.0, 18);
  glow.position.set(0, 2.5, 0); g.add(glow);

  // Path to house
  const pathMat = new THREE.MeshLambertMaterial({ color: 0xc8b888 });
  for (let pz = 0; pz < 8; pz++) {
    const stone = new THREE.Mesh(new THREE.BoxGeometry(rand(0.6, 1.2), 0.08, rand(0.5, 0.9)), pathMat);
    stone.position.set(rand(-0.4, 0.4), 0.04, 5 + pz * 1.1);
    stone.rotation.y = rand(-0.3, 0.3);
    g.add(stone);
  }

  g.position.copy(LONELY_HOUSE_POS);
  scene.add(g);
}

// ─── Component ────────────────────────────────────────────────
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
  const skyObjRef  = useRef<ReturnType<typeof buildSky> | null>(null);
  const contactCountRef = useRef(contactCount);
  useEffect(() => { contactCountRef.current = contactCount; }, [contactCount]);

  // Fixed spawn: near house door at z=-20, x side
  const SHADOW_SPAWN = new THREE.Vector3(9, 0, -18);

  const init = useCallback(() => {
    if (!mountRef.current) return;
    const W = mountRef.current.clientWidth, H = mountRef.current.clientHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    mountRef.current.appendChild(renderer.domElement);
    rendRef.current = renderer;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(SKY_BLUE);
    scene.fog = new THREE.Fog(FOG_COLOR, 40, 120);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(72, W / H, 0.1, 400);
    camera.position.set(0, 1.7, 5);
    camRef.current = camera;

    // Bright daytime lighting
    scene.add(new THREE.AmbientLight(0xfff8e8, 1.8));
    const sun = new THREE.DirectionalLight(0xfff5d0, 1.4);
    sun.position.set(30, 60, 20);
    scene.add(sun);
    // Fill light (sky bounce)
    const skyLight = new THREE.HemisphereLight(0x87ceeb, 0x8aaa60, 0.5);
    scene.add(skyLight);

    // Ground
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), new THREE.MeshLambertMaterial({ color: GRASS }));
    ground.rotation.x = -Math.PI / 2; scene.add(ground);

    // Road
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

    // Houses
    const houseSide = (side: number) => {
      for (let z = -70; z < 70; z += randInt(11, 15)) {
        const hx = side * rand(7, 10);
        makeHouse(scene, hx, z + rand(-1, 1), side > 0 ? -Math.PI / 2 : Math.PI / 2);
        makeTree(scene, hx + rand(-2.5, 2.5), z + rand(-5, -2));
        if (Math.random() > 0.35) makeTree(scene, hx + rand(-2.5, 2.5), z + rand(2, 5));
        makeFence(scene, side > 0 ? hx - 3 : hx - 3.5, z - 5, 7, 'z');
      }
    };
    houseSide(1); houseSide(-1);

    for (let z = -80; z < 80; z += 14) { makeLamp(scene, 5.8, z); makeLamp(scene, -5.8, z); }

    const benchMat = new THREE.MeshLambertMaterial({ color: 0x8a6040 });
    for (let z = -60; z < 60; z += 22) {
      [5.2, -5.2].forEach(bx => {
        const bench = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.12, 0.45), benchMat);
        bench.position.set(bx, 0.5, z); scene.add(bench);
        [-0.52, 0.52].forEach(lx => {
          const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.1), benchMat);
          leg.position.set(bx + lx, 0.25, z); scene.add(leg);
        });
        // Backrest
        const back = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.35, 0.07), benchMat);
        back.position.set(bx, 0.85, z + 0.2); scene.add(back);
      });
    }

    makeLonelyHouse(scene);
    skyObjRef.current = buildSky(scene);

    // Create shadow — guaranteed, placed right at spawn
    const shadow = makeShadow(scene, SHADOW_SPAWN.clone());
    shadowRef.current = shadow;

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
    const mouseMove = (e: MouseEvent) => {
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
    window.addEventListener('mousemove', mouseMove);
    document.addEventListener('pointerlockchange', lockChange);
    mountRef.current?.addEventListener('click', click);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('mousemove', mouseMove);
      document.removeEventListener('pointerlockchange', lockChange);
    };
  }, []);

  const startLoop = useCallback(() => {
    const renderer = rendRef.current!;
    const scene    = sceneRef.current!;
    const camera   = camRef.current!;

    const loop = () => {
      frameRef.current = requestAnimationFrame(loop);
      timeRef.current += 0.016;
      const t = timeRef.current;

      const shadow = shadowRef.current;

      // HUD
      fpsRef.current.n++;
      const now = performance.now();
      if (now - fpsRef.current.last > 900) {
        const fps = Math.round(fpsRef.current.n / ((now - fpsRef.current.last) / 1000));
        fpsRef.current = { n: 0, last: now };
        const shadowDist = shadow ? camera.position.distanceTo(shadow.position) : 99;
        let isLooking = false;
        if (shadow) {
          const toShadow = new THREE.Vector3().subVectors(shadow.position, camera.position).normalize();
          const camFwd = new THREE.Vector3(); camera.getWorldDirection(camFwd);
          isLooking = camFwd.dot(toShadow) > 0.45;
        }
        const inLonelyHouse = camera.position.distanceTo(LONELY_HOUSE_POS) < 6;
        onHUDUpdate({ pos: camera.position.clone(), fps, shadowDist, isLooking, inLonelyHouse });
      }

      // Movement
      const keys = keysRef.current;
      camera.quaternion.setFromEuler(new THREE.Euler(pitchRef.current, yawRef.current, 0, 'YXZ'));
      const fwd   = new THREE.Vector3(-Math.sin(yawRef.current), 0, -Math.cos(yawRef.current));
      const right = new THREE.Vector3(Math.cos(yawRef.current), 0, -Math.sin(yawRef.current));
      const mv    = new THREE.Vector3();
      const isMoving = keys.has('KeyW') || keys.has('KeyS') || keys.has('KeyA') || keys.has('KeyD')
        || keys.has('ArrowUp') || keys.has('ArrowDown');
      const spd = 0.085;
      if (keys.has('KeyW') || keys.has('ArrowUp'))    mv.addScaledVector(fwd, spd);
      if (keys.has('KeyS') || keys.has('ArrowDown'))  mv.addScaledVector(fwd, -spd);
      if (keys.has('KeyA') || keys.has('ArrowLeft'))  mv.addScaledVector(right, -spd);
      if (keys.has('KeyD') || keys.has('ArrowRight')) mv.addScaledVector(right, spd);

      if (isMoving) { bobRef.current += 0.12; camera.position.y = 1.7 + Math.sin(bobRef.current) * 0.045; }
      else camera.position.y += (1.7 - camera.position.y) * 0.12;

      const next = camera.position.clone().add(mv);
      next.y = camera.position.y;
      next.x = Math.max(-12, Math.min(12, next.x));
      next.z = Math.max(-110, Math.min(110, next.z));
      camera.position.copy(next);

      // ── Shadow AI ────────────────────────────────────────
      if (shadow) {
        const cc = contactCountRef.current;
        const chaseSpeed = 0.003 + cc * 0.0035;
        const toPlayer = new THREE.Vector3().subVectors(camera.position, shadow.position);
        toPlayer.y = 0;
        const dist = toPlayer.length();
        if (dist > 0.4) {
          toPlayer.normalize().multiplyScalar(chaseSpeed);
          shadow.position.add(toPlayer);
        }
        shadow.position.y = 0;
        shadow.lookAt(camera.position.x, 1, camera.position.z);

        // Limb animation
        const walkFreq = 1.4 + cc * 0.25;
        const walkAmp  = 0.18 + cc * 0.04;
        shadow.children.forEach((child, i) => {
          if (i === 5 || i === 6) child.rotation.x = Math.sin(t * walkFreq + i) * walkAmp; // legs
          if (i === 3 || i === 4) child.rotation.x = Math.sin(t * walkFreq + i + Math.PI) * walkAmp * 0.6; // arms
        });
        shadow.rotation.z = Math.sin(t * 0.5) * 0.025;

        // Contact
        if (dist < 1.9 && !contactRef.current) {
          contactRef.current = true;
          onEntityContact();
          setTimeout(() => { contactRef.current = false; }, 4000);
        }
      }

      // ── Animate sky objects ───────────────────────────────
      if (skyObjRef.current) {
        const { jupiterGroup, eyeGroup, clockGroup, moonGroup, pyrGroup } = skyObjRef.current;
        jupiterGroup.rotation.y = t * 0.018;
        // Moon orbit around jupiter small moon
        const jChild = jupiterGroup.children.find(c => c.userData.isMoon);
        if (jChild) { jChild.position.set(Math.cos(t * 0.4) * 32, Math.sin(t * 0.15) * 5, Math.sin(t * 0.4) * 32); }

        eyeGroup.position.y = 52 + Math.sin(t * 0.35 + (eyeGroup.userData.floatSeed as number)) * 4;
        eyeGroup.rotation.y = t * 0.08;
        // Eye follows camera slowly
        eyeGroup.lookAt(camera.position);

        clockGroup.position.y = 40 + Math.sin(t * 0.28 + (clockGroup.userData.floatSeed as number)) * 3;
        clockGroup.rotation.z = Math.sin(t * 0.06) * 0.4;

        moonGroup.position.y = 70 + Math.sin(t * 0.2 + (moonGroup.userData.floatSeed as number)) * 2;

        pyrGroup.position.y = 60 + Math.sin(t * 0.32 + (pyrGroup.userData.floatSeed as number)) * 3;
        pyrGroup.rotation.y = t * 0.03;

        // Drift clouds
        scene.traverse(obj => {
          if (obj.userData.cloudSpeed) {
            obj.position.x += obj.userData.cloudSpeed as number;
            if (obj.position.x > 220) obj.position.x = -220;
          }
        });
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
