import * as THREE from "three";

const canvas = document.querySelector("#universe");
const intro = document.querySelector("#intro");
const enterButton = document.querySelector("#enter");
const caption = document.querySelector("#caption");
const floatingWords = document.querySelector("#floating-words");
const floatingImages = document.querySelector("#floating-images");
const finale = document.querySelector("#finale");
const loveButton = document.querySelector("#love-button");
const loveMessage = document.querySelector("#love-message");
const loveButtonLabel = document.querySelector("#love-button .love-button-label");

if (
  !(canvas instanceof HTMLCanvasElement) ||
  !(intro instanceof HTMLElement) ||
  !(enterButton instanceof HTMLButtonElement) ||
  !(caption instanceof HTMLElement) ||
  !(floatingWords instanceof HTMLElement) ||
  !(floatingImages instanceof HTMLElement) ||
  !(finale instanceof HTMLElement) ||
  !(loveButton instanceof HTMLButtonElement) ||
  !(loveMessage instanceof HTMLParagraphElement) ||
  !(loveButtonLabel instanceof HTMLSpanElement)
) {
  throw new Error("Faltan elementos necesarios para iniciar la experiencia 3D.");
}

const renderer = new THREE.WebGLRenderer({
  canvas,
  alpha: true,
  antialias: true,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x08050d, 0);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  100,
);
const introCameraZ = 11.6;
const galaxyCameraZ = 15;
camera.position.set(0, 0, introCameraZ);

const scene = new THREE.Scene();
const clock = new THREE.Clock();
const random = (min, max) => min + Math.random() * (max - min);
const clamp01 = (value) => Math.max(0, Math.min(value, 1));
const smoothstep = (value) => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};

const heartGroup = new THREE.Group();
scene.add(heartGroup);

const heartShape = new THREE.Shape();
heartShape.moveTo(0, 0.12);
heartShape.bezierCurveTo(0, 0.12, -0.1, 1.1, -1.13, 1.1);
heartShape.bezierCurveTo(-2.36, 1.1, -2.52, -0.19, -1.5, -1.13);
heartShape.lineTo(0, -2.43);
heartShape.lineTo(1.5, -1.13);
heartShape.bezierCurveTo(2.52, -0.19, 2.36, 1.1, 1.13, 1.1);
heartShape.bezierCurveTo(0.1, 1.1, 0, 0.12, 0, 0.12);

const heartGeometry = new THREE.ExtrudeGeometry(heartShape, {
  depth: 0.46,
  bevelEnabled: true,
  bevelSegments: 6,
  steps: 1,
  bevelSize: 0.13,
  bevelThickness: 0.15,
  curveSegments: 18,
});
heartGeometry.computeVertexNormals();

const heartMaterial = new THREE.MeshStandardMaterial({
  color: 0xff279c,
  emissive: 0xec087d,
  emissiveIntensity: 2.2,
  metalness: 0.17,
  roughness: 0.2,
  transparent: true,
});
const heartMesh = new THREE.Mesh(heartGeometry, heartMaterial);
heartMesh.position.set(0, 0.65, -0.23);
heartMesh.scale.setScalar(0.82);
heartGroup.add(heartMesh);

const heartLight = new THREE.PointLight(0xff3cb4, 34, 9, 1.8);
heartLight.position.set(0, 0.15, 1.75);
heartGroup.add(heartLight);
scene.add(new THREE.AmbientLight(0xffc1e7, 1.2));

const keyLight = new THREE.PointLight(0xffaddd, 22, 12);
keyLight.position.set(-3, 4, 6);
scene.add(keyLight);

const starCount = 3000;
const starPositions = new Float32Array(starCount * 3);
const starColors = new Float32Array(starCount * 3);
const starSizes = new Float32Array(starCount);
const starPhases = new Float32Array(starCount);
const starSpeeds = new Float32Array(starCount);

for (let i = 0; i < starCount; i += 1) {
  starPositions[i * 3] = random(-20, 20);
  starPositions[i * 3 + 1] = random(-12, 12);
  starPositions[i * 3 + 2] = random(-22, 1);

  const color = new THREE.Color().setHSL(
    random(0.68, 0.94),
    random(0.36, 0.8),
    random(0.66, 0.98),
  );
  starColors[i * 3] = color.r;
  starColors[i * 3 + 1] = color.g;
  starColors[i * 3 + 2] = color.b;
  starSizes[i] = random(0.55, 1.65);
  starPhases[i] = random(0, Math.PI * 2);
  starSpeeds[i] = random(0.45, 1.6);
}

const starGeometry = new THREE.BufferGeometry();
starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
starGeometry.setAttribute("aColor", new THREE.BufferAttribute(starColors, 3));
starGeometry.setAttribute("aSize", new THREE.BufferAttribute(starSizes, 1));
starGeometry.setAttribute("aPhase", new THREE.BufferAttribute(starPhases, 1));
starGeometry.setAttribute("aSpeed", new THREE.BufferAttribute(starSpeeds, 1));

const starMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
    uPixelRatio: { value: renderer.getPixelRatio() },
    uOpacity: { value: 0.85 },
  },
  vertexShader: `
    attribute vec3 aColor;
    attribute float aSize;
    attribute float aPhase;
    attribute float aSpeed;
    uniform float uTime;
    uniform float uPixelRatio;
    varying vec3 vColor;
    varying float vTwinkle;

    void main() {
      vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
      float depth = max(1.0, -viewPosition.z);
      vTwinkle = 0.74 + 0.26 * sin(uTime * aSpeed + aPhase);
      vColor = aColor;
      gl_PointSize = clamp(aSize * uPixelRatio * (24.0 / depth) * vTwinkle, 1.0, 5.0);
      gl_Position = projectionMatrix * viewPosition;
    }
  `,
  fragmentShader: `
    uniform float uOpacity;
    varying vec3 vColor;
    varying float vTwinkle;

    void main() {
      float radius = length(gl_PointCoord - 0.5);
      float pointAlpha = 1.0 - smoothstep(0.22, 0.5, radius);
      if (pointAlpha < 0.015) discard;
      gl_FragColor = vec4(vColor * (0.82 + vTwinkle * 0.55), pointAlpha * uOpacity);
    }
  `,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});
const starField = new THREE.Points(starGeometry, starMaterial);
starField.frustumCulled = false;
scene.add(starField);

const galaxyGroup = new THREE.Group();
galaxyGroup.rotation.x = 0.16;
scene.add(galaxyGroup);

const galaxyLight = new THREE.PointLight(0xff43b4, 25, 17, 1.5);
galaxyLight.position.set(0, 0, 2.25);
galaxyGroup.add(galaxyLight);

const particleCount = 14500;
const particleStarts = new Float32Array(particleCount * 3);
const particleTargets = new Float32Array(particleCount * 3);
const particleDirections = new Float32Array(particleCount * 3);
const particlePositions = new Float32Array(particleCount * 3);
const particleColors = new Float32Array(particleCount * 3);
const particleSizes = new Float32Array(particleCount);
const particlePhases = new Float32Array(particleCount);
const particleSpeeds = new Float32Array(particleCount);
const spiralArms = 5;
const spiralRadius = 6.0;

for (let i = 0; i < particleCount; i += 1) {
  const theta = Math.random() * Math.PI * 2;
  const fill = Math.sqrt(Math.random());
  const heartX = 16 * Math.pow(Math.sin(theta), 3);
  const heartY =
    13 * Math.cos(theta) -
    5 * Math.cos(2 * theta) -
    2 * Math.cos(3 * theta) -
    Math.cos(4 * theta);
  const startX = heartX * 0.092 * fill;
  const startY = heartY * 0.092 * fill + 0.08;
  const startZ = random(-0.38, 0.38);

  particleStarts[i * 3] = startX;
  particleStarts[i * 3 + 1] = startY;
  particleStarts[i * 3 + 2] = startZ;
  particlePositions[i * 3] = startX;
  particlePositions[i * 3 + 1] = startY;
  particlePositions[i * 3 + 2] = startZ;

  const radius = Math.pow(Math.random(), 0.64) * spiralRadius;
  const arm = i % spiralArms;
  const spiralAngle =
    (arm / spiralArms) * Math.PI * 2 +
    radius * 0.96 +
    random(-0.26, 0.26);
  const armSpread = 0.1 + radius * 0.036;
  particleTargets[i * 3] =
    Math.cos(spiralAngle) * radius + random(-armSpread, armSpread);
  particleTargets[i * 3 + 1] =
    Math.sin(spiralAngle) * radius * 0.67 + random(-armSpread, armSpread);
  particleTargets[i * 3 + 2] = random(-0.72, 0.72) * (1 - radius / 7.5);

  const direction = new THREE.Vector3(
    startX + random(-0.55, 0.55),
    startY + random(-0.5, 0.5),
    startZ + random(-0.45, 0.45),
  ).normalize();
  particleDirections[i * 3] = direction.x;
  particleDirections[i * 3 + 1] = direction.y;
  particleDirections[i * 3 + 2] = direction.z;

  const hue = random(0.79, 0.95) + (radius < 1.5 ? 0.025 : 0);
  const color = new THREE.Color().setHSL(
    hue,
    random(0.7, 0.98),
    random(radius < 1.25 ? 0.73 : 0.55, 0.91),
  );
  particleColors[i * 3] = color.r;
  particleColors[i * 3 + 1] = color.g;
  particleColors[i * 3 + 2] = color.b;
  particleSizes[i] = random(1.1, radius < 1.3 ? 4.4 : 3.25);
  particlePhases[i] = random(0, Math.PI * 2);
  particleSpeeds[i] = random(0.5, 1.45);
}

const galaxyGeometry = new THREE.BufferGeometry();
const galaxyPositionAttribute = new THREE.BufferAttribute(particlePositions, 3);
galaxyPositionAttribute.setUsage(THREE.DynamicDrawUsage);
galaxyGeometry.setAttribute("position", galaxyPositionAttribute);
galaxyGeometry.setAttribute("aColor", new THREE.BufferAttribute(particleColors, 3));
galaxyGeometry.setAttribute("aSize", new THREE.BufferAttribute(particleSizes, 1));
galaxyGeometry.setAttribute("aPhase", new THREE.BufferAttribute(particlePhases, 1));
galaxyGeometry.setAttribute("aSpeed", new THREE.BufferAttribute(particleSpeeds, 1));

const galaxyMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
    uPixelRatio: { value: renderer.getPixelRatio() },
    uOpacity: { value: 0.9 },
  },
  vertexShader: `
    attribute vec3 aColor;
    attribute float aSize;
    attribute float aPhase;
    attribute float aSpeed;
    uniform float uTime;
    uniform float uPixelRatio;
    varying vec3 vColor;
    varying float vTwinkle;

    void main() {
      vec3 animatedPosition = position;
      animatedPosition.z += sin(uTime * aSpeed + aPhase) * 0.045;
      vec4 viewPosition = modelViewMatrix * vec4(animatedPosition, 1.0);
      float depth = max(1.0, -viewPosition.z);
      vTwinkle = 0.77 + 0.23 * sin(uTime * aSpeed + aPhase);
      vColor = aColor;
      gl_PointSize = clamp(aSize * uPixelRatio * (32.0 / depth) * vTwinkle, 1.0, 12.0);
      gl_Position = projectionMatrix * viewPosition;
    }
  `,
  fragmentShader: `
    uniform float uOpacity;
    varying vec3 vColor;
    varying float vTwinkle;

    void main() {
      float radius = length(gl_PointCoord - 0.5);
      float pointAlpha = 1.0 - smoothstep(0.19, 0.5, radius);
      if (pointAlpha < 0.015) discard;
      gl_FragColor = vec4(vColor * (0.74 + vTwinkle * 0.68), pointAlpha * uOpacity);
    }
  `,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});
const galaxyParticles = new THREE.Points(galaxyGeometry, galaxyMaterial);
galaxyParticles.frustumCulled = false;
galaxyGroup.add(galaxyParticles);

const constellationNodes = [
  new THREE.Vector3(-2.1, -0.94, 0.72),
  new THREE.Vector3(-2.1, 0.94, 0.72),
  new THREE.Vector3(-0.7, -0.08, 0.72),
  new THREE.Vector3(0, 1.05, 0.72),
  new THREE.Vector3(0.7, -0.08, 0.72),
  new THREE.Vector3(2.1, 0.94, 0.72),
  new THREE.Vector3(2.1, -0.94, 0.72),
];
const constellationPointPositions = new Float32Array(constellationNodes.length * 3);
const constellationColors = new Float32Array(constellationNodes.length * 3);
const constellationSizes = new Float32Array([7, 7, 7.5, 11, 7.5, 7, 7]);
const constellationPhases = new Float32Array(constellationNodes.length);
const constellationSpeeds = new Float32Array(constellationNodes.length);
const constellationNodeColors = [
  0xffc3ee,
  0xff8bd7,
  0xfffffb,
  0xfff6ff,
  0xffffff,
  0xff9de4,
  0xffd1f3,
];

for (let i = 0; i < constellationNodes.length; i += 1) {
  constellationPointPositions.set(constellationNodes[i].toArray(), i * 3);
  const color = new THREE.Color(constellationNodeColors[i]);
  constellationColors.set([color.r, color.g, color.b], i * 3);
  constellationPhases[i] = random(0, Math.PI * 2);
  constellationSpeeds[i] = random(0.65, 1.4);
}

const constellationGeometry = new THREE.BufferGeometry();
const constellationAttributes = [
  ["position", new THREE.BufferAttribute(constellationPointPositions, 3)],
  ["aColor", new THREE.BufferAttribute(constellationColors, 3)],
  ["aSize", new THREE.BufferAttribute(constellationSizes, 1)],
  ["aPhase", new THREE.BufferAttribute(constellationPhases, 1)],
  ["aSpeed", new THREE.BufferAttribute(constellationSpeeds, 1)],
];
for (const [name, attribute] of constellationAttributes) {
  constellationGeometry.setAttribute(name, attribute);
}

const constellationMaterial = galaxyMaterial.clone();
constellationMaterial.uniforms.uOpacity.value = 0;

const constellationLineMaterial = new THREE.MeshBasicMaterial({
  color: 0xffa1e4,
  transparent: true,
  opacity: 0,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});
const constellationLines = new THREE.Group();
for (let i = 0; i < constellationNodes.length - 1; i += 1) {
  const start = constellationNodes[i];
  const end = constellationNodes[i + 1];
  const direction = new THREE.Vector3().subVectors(end, start);
  const segment = new THREE.Mesh(
    new THREE.CylinderGeometry(0.014, 0.014, direction.length(), 8, 1),
    constellationLineMaterial,
  );
  segment.position.copy(start).add(end).multiplyScalar(0.5);
  segment.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  constellationLines.add(segment);
}
const constellationStars = new THREE.Points(constellationGeometry, constellationMaterial);
const constellationGroup = new THREE.Group();
constellationGroup.position.set(0, -2.15, 0);
constellationGroup.add(constellationLines, constellationStars);
galaxyGroup.add(constellationGroup);

const coreMaterial = new THREE.MeshBasicMaterial({
  color: 0xffa3e2,
  transparent: true,
  opacity: 0.22,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});
const core = new THREE.Mesh(new THREE.SphereGeometry(0.48, 24, 24), coreMaterial);
core.scale.set(1, 0.7, 0.7);
core.position.set(0, 0, 0.15);
galaxyGroup.add(core);

const coreHeartCount = 2300;
const coreHeartPositions = new Float32Array(coreHeartCount * 3);
const coreHeartColors = new Float32Array(coreHeartCount * 3);
const coreHeartSizes = new Float32Array(coreHeartCount);
const coreHeartPhases = new Float32Array(coreHeartCount);
const coreHeartSpeeds = new Float32Array(coreHeartCount);

for (let i = 0; i < coreHeartCount; i += 1) {
  const theta = Math.random() * Math.PI * 2;
  const fill = Math.sqrt(Math.random());
  const heartX = 16 * Math.pow(Math.sin(theta), 3);
  const heartY =
    13 * Math.cos(theta) -
    5 * Math.cos(2 * theta) -
    2 * Math.cos(3 * theta) -
    Math.cos(4 * theta);
  coreHeartPositions[i * 3] = heartX * 0.085 * fill;
  coreHeartPositions[i * 3 + 1] = heartY * 0.085 * fill + 0.07;
  coreHeartPositions[i * 3 + 2] = random(-0.42, 0.42);

  const color = new THREE.Color().setHSL(
    random(0.88, 0.965),
    random(0.84, 1),
    random(0.67, 0.96),
  );
  coreHeartColors[i * 3] = color.r;
  coreHeartColors[i * 3 + 1] = color.g;
  coreHeartColors[i * 3 + 2] = color.b;
  coreHeartSizes[i] = random(1.5, 4.1);
  coreHeartPhases[i] = random(0, Math.PI * 2);
  coreHeartSpeeds[i] = random(0.5, 1.5);
}

const coreHeartGeometry = new THREE.BufferGeometry();
coreHeartGeometry.setAttribute(
  "position",
  new THREE.BufferAttribute(coreHeartPositions, 3),
);
coreHeartGeometry.setAttribute("aColor", new THREE.BufferAttribute(coreHeartColors, 3));
coreHeartGeometry.setAttribute("aSize", new THREE.BufferAttribute(coreHeartSizes, 1));
coreHeartGeometry.setAttribute("aPhase", new THREE.BufferAttribute(coreHeartPhases, 1));
coreHeartGeometry.setAttribute("aSpeed", new THREE.BufferAttribute(coreHeartSpeeds, 1));

const heartParticleMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
    uPixelRatio: { value: renderer.getPixelRatio() },
    uOpacity: { value: 0 },
  },
  vertexShader: `
    attribute vec3 aColor;
    attribute float aSize;
    attribute float aPhase;
    attribute float aSpeed;
    uniform float uTime;
    uniform float uPixelRatio;
    varying vec3 vColor;
    varying float vTwinkle;

    void main() {
      vec3 animatedPosition = position;
      animatedPosition.z += sin(uTime * aSpeed + aPhase) * 0.035;
      vec4 viewPosition = modelViewMatrix * vec4(animatedPosition, 1.0);
      float depth = max(1.0, -viewPosition.z);
      vTwinkle = 0.8 + 0.2 * sin(uTime * aSpeed + aPhase);
      vColor = aColor;
      gl_PointSize = clamp(aSize * uPixelRatio * (32.0 / depth) * vTwinkle, 1.0, 10.0);
      gl_Position = projectionMatrix * viewPosition;
    }
  `,
  fragmentShader: `
    uniform float uOpacity;
    varying vec3 vColor;
    varying float vTwinkle;

    void main() {
      float radius = length(gl_PointCoord - 0.5);
      float pointAlpha = 1.0 - smoothstep(0.18, 0.5, radius);
      if (pointAlpha < 0.015) discard;
      gl_FragColor = vec4(vColor * (0.82 + vTwinkle * 0.64), pointAlpha * uOpacity);
    }
  `,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});
const heartParticles = new THREE.Points(coreHeartGeometry, heartParticleMaterial);
heartParticles.frustumCulled = false;
heartParticles.position.z = 0.45;
galaxyGroup.add(heartParticles);

const burstCount = 720;
const burstPositions = new Float32Array(burstCount * 3);
const burstColors = new Float32Array(burstCount * 3);
const burstVelocities = new Float32Array(burstCount * 3);
for (let i = 0; i < burstCount; i += 1) {
  const direction = new THREE.Vector3(
    random(-1, 1),
    random(-1, 1),
    random(-0.8, 0.8),
  ).normalize();
  const speed = random(2.7, 7.5);
  burstVelocities[i * 3] = direction.x * speed;
  burstVelocities[i * 3 + 1] = direction.y * speed;
  burstVelocities[i * 3 + 2] = direction.z * speed;
  const color = new THREE.Color().setHSL(random(0.85, 0.97), 0.96, random(0.72, 0.98));
  burstColors[i * 3] = color.r;
  burstColors[i * 3 + 1] = color.g;
  burstColors[i * 3 + 2] = color.b;
}

const burstGeometry = new THREE.BufferGeometry();
const burstPositionAttribute = new THREE.BufferAttribute(burstPositions, 3);
burstPositionAttribute.setUsage(THREE.DynamicDrawUsage);
burstGeometry.setAttribute("position", burstPositionAttribute);
burstGeometry.setAttribute("aColor", new THREE.BufferAttribute(burstColors, 3));
burstGeometry.setAttribute("aSize", new THREE.BufferAttribute(
  Float32Array.from({ length: burstCount }, () => random(1.6, 4.6)),
  1,
));
burstGeometry.setAttribute(
  "aPhase",
  new THREE.BufferAttribute(Float32Array.from({ length: burstCount }, () => random(0, 6.28)), 1),
);
burstGeometry.setAttribute(
  "aSpeed",
  new THREE.BufferAttribute(Float32Array.from({ length: burstCount }, () => random(0.7, 1.5)), 1),
);
const burstMaterial = galaxyMaterial.clone();
burstMaterial.uniforms = THREE.UniformsUtils.clone(galaxyMaterial.uniforms);
burstMaterial.uniforms.uOpacity.value = 0;
const burstParticles = new THREE.Points(burstGeometry, burstMaterial);
burstParticles.frustumCulled = false;
scene.add(burstParticles);

const interactionCount = 110;
const interactionPositions = new Float32Array(interactionCount * 3);
for (let i = 0; i < interactionCount; i += 1) {
  const angle = (i / interactionCount) * Math.PI * 2;
  interactionPositions[i * 3] = Math.cos(angle);
  interactionPositions[i * 3 + 1] = Math.sin(angle);
  interactionPositions[i * 3 + 2] = random(-0.09, 0.09);
}

const interactionGeometry = new THREE.BufferGeometry();
interactionGeometry.setAttribute(
  "position",
  new THREE.BufferAttribute(interactionPositions, 3),
);
const interactionMaterial = new THREE.PointsMaterial({
  color: 0xffb7ed,
  size: 0.055,
  transparent: true,
  opacity: 0,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  sizeAttenuation: true,
});
const interactionRing = new THREE.Points(interactionGeometry, interactionMaterial);
interactionRing.frustumCulled = false;
scene.add(interactionRing);

const raycaster = new THREE.Raycaster();
raycaster.params.Points.threshold = 0.17;
const normalizedPointer = new THREE.Vector2();
const interactionPoint = new THREE.Vector3();
const cameraTarget = new THREE.Vector3();
let hasEntered = false;
let transitionStart = 0;
let transitionDuration = 3.15;
let ringStartedAt = -Infinity;
let isDragging = false;
let activePointerId = null;
let pointerStartX = 0;
let pointerStartY = 0;
let lastPointerX = 0;
let lastPointerY = 0;
let dragDistance = 0;
let dragRotationX = 0;
let dragRotationY = 0;
let pointerNdcX = 0;
let pointerNdcY = 0;
const targetRotation = new THREE.Vector2();
const currentRotation = new THREE.Vector2();

const words = [
  { text: "La niña de ojitos lindos", left: 5, top: 39 },
  { text: "Mi niña bonita", left: 72, top: 42 },
  { text: "Mi sonrisa favorita", left: 28, top: 23 },
  { text: "La dueña de mi corazón", left: 46, top: 82 },
  { text: "Contigo todo es más bonito", left: 24, top: 68 },
  { text: "Mi personita favorita", left: 73, top: 63 },
  { text: "Esos ojitos me enamoran", left: 4, top: 57 },
  { text: "Mi lugar favorito es contigo", left: 63, top: 26 },
  { text: "Te quiero hasta las estrellas", left: 8, top: 78 },
  { text: "La más hermosa de mi universo", left: 65, top: 82 },
];
words.forEach(({ text, left, top }, index) => {
  const element = document.createElement("span");
  element.className = "floating-word";
  element.textContent = text;
  element.style.left = `${left}%`;
  element.style.top = `${top}%`;
  element.style.setProperty("translate", "-50% 0");
  element.style.setProperty("--delay", `${index * 1.25}s`);
  element.style.setProperty("--duration", `${8 + index * 0.65}s`);
  floatingWords.append(element);
});

function beginEntry() {
  if (hasEntered) return;
  hasEntered = true;
  transitionStart = clock.elapsedTime;
  transitionDuration = Math.max(1.2, transitionDuration);
  enterButton.disabled = true;
  enterButton.classList.add("is-opening");
  intro.classList.add("is-leaving");
  burstMaterial.uniforms.uOpacity.value = 1;

  for (let i = 0; i < burstCount; i += 1) {
    burstPositions[i * 3] = random(-0.72, 0.72);
    burstPositions[i * 3 + 1] = random(-0.72, 0.72);
    burstPositions[i * 3 + 2] = random(-0.46, 0.46);
  }
  burstPositionAttribute.needsUpdate = true;

  window.setTimeout(() => {
    caption.classList.add("is-visible");
    floatingImages.classList.add("is-visible");
    floatingWords.classList.add("is-visible");
  }, 850);
  window.setTimeout(() => finale.classList.add("is-visible"), transitionDuration * 1000 + 600);
}

enterButton.addEventListener("click", beginEntry);

loveButton.addEventListener("click", () => {
  loveMessage.hidden = false;
  loveButton.setAttribute("aria-expanded", "true");
  loveButton.classList.add("is-open");
  loveButtonLabel.textContent = "Mi corazón es tuyo";

  const sparkles = ["✦", "♥", "✧", "·"];
  for (let i = 0; i < 14; i += 1) {
    const angle = (i / 14) * Math.PI * 2 + random(-0.18, 0.18);
    const distance = random(40, 116);
    const sparkle = document.createElement("span");
    sparkle.className = "love-spark";
    sparkle.setAttribute("aria-hidden", "true");
    sparkle.textContent = sparkles[i % sparkles.length];
    sparkle.style.setProperty("--spark-x", `${Math.cos(angle) * distance}px`);
    sparkle.style.setProperty("--spark-y", `${Math.sin(angle) * distance}px`);
    sparkle.style.setProperty("--spark-size", `${random(0.72, 1.38)}rem`);
    sparkle.style.setProperty(
      "--spark-color",
      i % 3 === 0 ? "#fff5fc" : i % 3 === 1 ? "#ffc0e6" : "#ff83cb",
    );
    loveButton.append(sparkle);
    window.setTimeout(() => sparkle.remove(), 950);
  }
});

function updatePointer(event) {
  pointerNdcX = (event.clientX / window.innerWidth) * 2 - 1;
  pointerNdcY = -(event.clientY / window.innerHeight) * 2 + 1;
  if (!isDragging || event.pointerId !== activePointerId) return;

  const deltaX = event.clientX - lastPointerX;
  const deltaY = event.clientY - lastPointerY;
  dragDistance += Math.abs(deltaX) + Math.abs(deltaY);
  dragRotationY += deltaX * 0.004;
  dragRotationX += deltaY * 0.004;
  dragRotationX = Math.max(-0.9, Math.min(0.9, dragRotationX));
  dragRotationY = Math.max(-1.3, Math.min(1.3, dragRotationY));
  lastPointerX = event.clientX;
  lastPointerY = event.clientY;
}

window.addEventListener("pointermove", updatePointer, { passive: true });

canvas.addEventListener("pointerdown", (event) => {
  if (!hasEntered || activePointerId !== null) return;
  isDragging = true;
  activePointerId = event.pointerId;
  pointerStartX = event.clientX;
  pointerStartY = event.clientY;
  lastPointerX = event.clientX;
  lastPointerY = event.clientY;
  dragDistance = 0;
  canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener("pointerup", (event) => {
  if (event.pointerId !== activePointerId) return;
  isDragging = false;
  activePointerId = null;

  if (dragDistance > 12) return;
  normalizedPointer.set(
    (pointerStartX / window.innerWidth) * 2 - 1,
    -(pointerStartY / window.innerHeight) * 2 + 1,
  );
  raycaster.setFromCamera(normalizedPointer, camera);
  const hits = raycaster.intersectObjects([galaxyParticles, heartParticles], false);
  if (hits.length === 0) return;

  interactionPoint.copy(hits[0].point);
  interactionRing.position.copy(interactionPoint);
  interactionRing.scale.setScalar(0.015);
  interactionMaterial.opacity = 0.95;
  ringStartedAt = clock.elapsedTime;
});

canvas.addEventListener("pointercancel", (event) => {
  if (event.pointerId !== activePointerId) return;
  isDragging = false;
  activePointerId = null;
});

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.setSize(window.innerWidth, window.innerHeight);
  for (const material of [
    starMaterial,
    galaxyMaterial,
    heartParticleMaterial,
    burstMaterial,
    constellationMaterial,
  ]) {
    material.uniforms.uPixelRatio.value = renderer.getPixelRatio();
  }
});

function animate() {
  requestAnimationFrame(animate);

  const elapsed = clock.getElapsedTime();
  const transitionAge = hasEntered ? elapsed - transitionStart : 0;
  const progress = hasEntered ? clamp01(transitionAge / transitionDuration) : 0;
  const assembly = smoothstep((progress - 0.13) / 0.87);

  starMaterial.uniforms.uTime.value = elapsed;
  galaxyMaterial.uniforms.uTime.value = elapsed;
  heartParticleMaterial.uniforms.uTime.value = elapsed;
  burstMaterial.uniforms.uTime.value = elapsed;
  constellationMaterial.uniforms.uTime.value = elapsed;

  const heartBeat = hasEntered
    ? 1 + Math.exp(-transitionAge * 4.2) * Math.sin(transitionAge * 29) * 0.23
    : 1 + Math.sin(elapsed * 3.1) * 0.045 + Math.sin(elapsed * 6.2) * 0.018;
  heartGroup.scale.setScalar(heartBeat);
  heartGroup.rotation.y = Math.sin(elapsed * 0.5) * 0.075;
  heartGroup.rotation.x = Math.sin(elapsed * 0.37) * 0.035;
  heartLight.intensity = hasEntered
    ? 34 + Math.exp(-transitionAge * 3) * 105
    : 31 + Math.sin(elapsed * 3.1) * 4;
  heartMaterial.emissiveIntensity = hasEntered
    ? 2.2 + Math.exp(-transitionAge * 3.1) * 8
    : 2.2 + Math.sin(elapsed * 3.1) * 0.35;
  heartMaterial.opacity = hasEntered ? 1 - smoothstep((transitionAge - 0.28) / 0.24) : 1;
  heartMesh.visible = !hasEntered || transitionAge < 0.54;
  heartMesh.scale.setScalar(
    hasEntered && transitionAge < 0.48 ? 0.82 * (1 + Math.exp(-transitionAge * 4) * 0.22) : 0.82,
  );

  if (hasEntered) {
    const burstStrength = Math.sin(progress * Math.PI) * (1 - smoothstep(progress / 0.43));
    const positions = galaxyPositionAttribute.array;
    for (let i = 0; i < particleCount; i += 1) {
      const index = i * 3;
      const spread = 3.2 * burstStrength;
      const driftX = Math.sin(elapsed * 1.7 + particlePhases[i]) * 0.035;
      const driftY = Math.cos(elapsed * 1.35 + particlePhases[i]) * 0.035;
      const baseX =
        particleStarts[index] +
        (particleTargets[index] - particleStarts[index]) * assembly +
        particleDirections[index] * spread +
        driftX * assembly;
      const baseY =
        particleStarts[index + 1] +
        (particleTargets[index + 1] - particleStarts[index + 1]) * assembly +
        particleDirections[index + 1] * spread +
        driftY * assembly;
      const orbitAngle = transitionAge * particleSpeeds[i] * 0.008;
      const orbitCos = Math.cos(orbitAngle);
      const orbitSin = Math.sin(orbitAngle);
      positions[index] = baseX * orbitCos - baseY * orbitSin;
      positions[index + 1] = baseX * orbitSin + baseY * orbitCos;
      positions[index + 2] =
        particleStarts[index + 2] +
        (particleTargets[index + 2] - particleStarts[index + 2]) * assembly +
        particleDirections[index + 2] * spread +
        Math.sin(elapsed * 1.1 + particlePhases[i]) * 0.045 * assembly;
    }
    galaxyPositionAttribute.needsUpdate = true;
    galaxyMaterial.uniforms.uOpacity.value = 0.88;
    heartParticleMaterial.uniforms.uOpacity.value = smoothstep((progress - 0.4) / 0.42);
    coreMaterial.opacity = 0.14 + smoothstep((progress - 0.58) / 0.35) * 0.32;
    const constellationReveal = smoothstep((progress - 0.43) / 0.3);
    constellationMaterial.uniforms.uOpacity.value =
      constellationReveal * (0.88 + Math.sin(elapsed * 2.2) * 0.1);
    constellationLineMaterial.opacity = constellationReveal * 0.7;
    constellationGroup.scale.setScalar(0.91 + constellationReveal * 0.09);
    constellationGroup.rotation.y = Math.sin(elapsed * 0.38) * 0.045;

    const cameraProgress = smoothstep(progress);
    camera.position.z = THREE.MathUtils.lerp(introCameraZ, galaxyCameraZ, cameraProgress);
    targetRotation.set(
      -pointerNdcY * 0.075 + dragRotationX,
      pointerNdcX * 0.09 + dragRotationY,
    );
    currentRotation.lerp(targetRotation, 0.035);
    galaxyGroup.rotation.x = 0.16 + currentRotation.x;
    galaxyGroup.rotation.y = currentRotation.y;
    galaxyGroup.rotation.z = elapsed * 0.025;
    heartParticles.rotation.y = Math.sin(elapsed * 0.53) * 0.11;
    core.scale.setScalar(1 + Math.sin(elapsed * 2.5) * 0.11);
    galaxyLight.intensity = 23 + Math.sin(elapsed * 2.1) * 4;

    const burstAge = transitionAge;
    if (burstAge < 1.55) {
      for (let i = 0; i < burstCount; i += 1) {
        const index = i * 3;
        const damping = Math.exp(-burstAge * 0.75);
        burstPositions[index] += burstVelocities[index] * 0.016 * damping;
        burstPositions[index + 1] += burstVelocities[index + 1] * 0.016 * damping;
        burstPositions[index + 2] += burstVelocities[index + 2] * 0.016 * damping;
      }
      burstPositionAttribute.needsUpdate = true;
      burstMaterial.uniforms.uOpacity.value = 0.95 * (1 - clamp01(burstAge / 1.55));
    } else {
      burstMaterial.uniforms.uOpacity.value = 0;
    }
  } else {
    heartParticleMaterial.uniforms.uOpacity.value = 0.36;
    coreMaterial.opacity = 0;
  }

  if (elapsed - ringStartedAt < 0.85) {
    const ringProgress = clamp01((elapsed - ringStartedAt) / 0.85);
    interactionRing.scale.setScalar(0.015 + ringProgress * 0.46);
    interactionMaterial.opacity = 0.95 * (1 - ringProgress);
  } else {
    interactionMaterial.opacity = 0;
  }

  renderer.render(scene, camera);
}

animate();
