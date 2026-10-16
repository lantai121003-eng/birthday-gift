"use strict";

(() => {
  const element = (id) => document.getElementById(id);
  const canvas = element("universe");
  const interactionSurface = element("scene-space");
  let projection = { scale: 1, offset: 0, rect: { left: 0, top: 0, right: innerWidth, bottom: innerHeight, width: innerWidth, height: innerHeight } };
  const defaultGift = {
    to: "欣雨",
    from: "懒羊羊大王",
    message: "庆幸在人海和你相遇。\n愿你有追光的勇气，也有被爱包围的底气。\n愿平凡的日子里，总有小小的幸运与你相遇。\n新的一岁，自由、明亮，成为你喜欢的自己。",
  };
  const storageKey = "little-universe-gift-v1";
  let gift = { ...defaultGift };
  const params = new URLSearchParams(location.search);
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
    if (saved && typeof saved === "object") {
      for (const key of ["to", "from", "message"]) {
        if (key === "to" && ["特别的你", "小鸭"].includes(saved[key])) continue;
        if (key === "from" && saved[key] === "一个惦记你的人") continue;
        if (key === "message" && saved[key] === "愿你有追光的勇气，也有被爱包围的底气。\n愿平凡的日子里，总有小小的幸运与你相遇。\n新的一岁，自由、明亮，成为你喜欢的自己。") continue;
        if (typeof saved[key] === "string" && saved[key].trim()) gift[key] = saved[key];
      }
    }
  } catch {}
  for (const key of ["to", "from", "message"]) {
    if (params.get(key)?.trim()) gift[key] = params.get(key).trim();
  }
  gift.to = Array.from(gift.to).slice(0, 12).join("");
  gift.from = Array.from(gift.from).slice(0, 24).join("");
  gift.message = Array.from(gift.message).slice(0, 300).join("");

  let phase = "welcome";
  let phaseStart = performance.now();
  let reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let warmed = 0;
  let candleLight = 0;
  let introHover = 0;
  let magicReturnPhase = "cake";
  let magicFromDuck = false;
  let duckHatReady = false;
  let heartPulse = 0;
  let frameCount = 0;
  let lastFrame = performance.now();
  let running = true;
  let started = false;
  let storyTimer;
  let toastTimer;
  let nameTarget;
  let activeTarget;
  let width = innerWidth;
  let height = innerHeight;
  let pixelRatio = 1;
  let rotation = 0.24;
  let tilt = -0.13;
  let rotationVelocity = 0;
  let pointerDown = false;
  let pointerMoved = 0;
  let dragTotal = 0;
  let previousPointerX = 0;
  let previousPointerY = 0;
  let downPointerX = 0;
  let downPointerY = 0;
  let lastPointerAt = 0;
  const pointer = { x: -100, y: -100, power: 0, present: false, screenX: -100, screenY: -100, kind: "mouse" };
  const count = innerWidth < 600 ? 13500 : 20500;
  const starCount = innerWidth < 600 ? 720 : 1450;
  const flameCount = 780;
  const random = (min, max) => min + Math.random() * (max - min);
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const smooth = (value) => {
    const bounded = clamp(value, 0, 1);
    return bounded * bounded * (3 - 2 * bounded);
  };

  function showToast(text) {
    element("toast").textContent = text;
    element("toast").hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { element("toast").hidden = true; }, 4200);
  }

  function updateGift() {
    element("recipient-label").textContent = gift.to;
    element("letter-message").textContent = gift.message;
    element("letter-from").textContent = gift.from;
    element("gift-to").value = gift.to;
    element("gift-from").value = gift.from;
    element("gift-message").value = gift.message;
    document.title = `给${gift.to}的神秘礼物`;
    document.querySelectorAll("[data-recipient]").forEach(node => { node.textContent = gift.to; });
    if (nameTarget) {
      nameTarget = makeText(gift.to, 7.0, true);
      if (phase === "letter") activeTarget = nameTarget;
      requestAnimationFrame(updateSceneFrame);
    }
  }

  function setReduced(value) {
    reduced = value;
    document.body.classList.toggle("reduced", value);
    element("motion-toggle").setAttribute("aria-pressed", String(value));
    element("motion-toggle").textContent = value ? "恢复动态" : "减少动态";
  }

  updateGift();
  setReduced(reduced);
  element("motion-toggle").addEventListener("click", () => setReduced(!reduced));
  element("personalize").addEventListener("click", () => { updateGift(); element("edit-dialog").showModal(); });
  document.querySelectorAll("[data-close]").forEach((button) => button.addEventListener("click", () => button.closest("dialog").close()));
  document.querySelectorAll("dialog").forEach((dialog) => dialog.addEventListener("click", (event) => {
    if (event.target !== dialog || dialog.id === "error-dialog") return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  }));
  element("edit-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const values = new FormData(event.target);
    const next = Object.fromEntries(["to", "from", "message"].map((key) => [key, String(values.get(key)).trim()]));
    if (Object.values(next).some((value) => !value)) { showToast("给每一份心意留一点文字吧。"); return; }
    gift = next;
    let persisted = true;
    try { localStorage.setItem(storageKey, JSON.stringify(gift)); } catch { persisted = false; }
    updateGift();
    element("edit-dialog").close();
    showToast(persisted ? "这份心意，已经藏进星光里了。" : "文案已更新；浏览器不允许保存，关闭后可能丢失。");
  });

  function publicAddress() {
    return location.protocol.startsWith("http") && !["localhost", "127.0.0.1", "::1", "[::1]", "0.0.0.0"].includes(location.hostname);
  }

  element("share").addEventListener("click", () => {
    const address = new URL(location.href);
    address.hash = "";
    address.search = "";
    for (const key of ["to", "from", "message"]) address.searchParams.set(key, gift[key]);
    element("share-url").value = publicAddress() ? address.href : "当前是本地预览，暂时没有公网分享地址。";
    element("copy-link").disabled = !publicAddress();
    element("share-description").textContent = publicAddress()
      ? `这是一份送给${gift.to}的生日礼物。链接会带着你的专属文案，把心意和惊喜一起送达。`
      : "作品已完整保存在网页文件夹中。将整份文件夹发布到静态网站托管后，打开公开网址，即可在这里复制专属链接。当前预览链接无法发给异地的朋友。";
    element("share-dialog").showModal();
  });
  element("copy-link").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(element("share-url").value);
      showToast("礼物链接已复制。愿星光顺利抵达。");
    } catch {
      element("share-url").focus();
      element("share-url").select();
      showToast("请长按或使用快捷键复制选中的链接。");
    }
  });

  function showGraphicsError(message) {
    running = false;
    element("error-description").textContent = message;
    if (!element("error-dialog").open) element("error-dialog").showModal();
  }
  element("reload").addEventListener("click", () => location.reload());
  element("read-letter").addEventListener("click", () => {
    element("error-dialog").close();
    element("letter").hidden = false;
    element("headline").textContent = `${gift.to}，生日快乐。`;
    element("subtitle").textContent = "无论星光是否亮起，这份心意都在。";
    element("primary").hidden = true;
    element("action-hint").hidden = true;
    document.body.dataset.phase = "letter";
  });
  let gl;
  try {
    gl = canvas.getContext("webgl", { alpha: true, antialias: false, depth: true, premultipliedAlpha: false, preserveDrawingBuffer: true, powerPreference: "high-performance" });
    if (!gl) throw new Error("WebGL unavailable");
  } catch {
    showGraphicsError("当前浏览器没有启用 WebGL。请使用支持 WebGL 的浏览器，或在微信右上角选择「在浏览器打开」。你仍然可以先读生日信。");
    return;
  }
  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    stopMicrophone();
    showGraphicsError("图形连接暂时中断了。文案已经保留，可以重新打开继续，或先读生日信。");
  });

  const vertexSource = `
    precision highp float;
    attribute vec3 aPosition;
    attribute vec3 aColor;
    attribute float aSize;
    attribute float aSeed;
    uniform float uTime;
    uniform float uRotation;
    uniform float uTilt;
    uniform float uAspect;
    uniform float uScale;
    uniform float uYOffset;
    uniform float uPixelRatio;
    uniform float uWarm;
    uniform float uAtmosphere;
    uniform float uOpacity;
    uniform float uScreenHeight;
    uniform float uStill;
    uniform float uCandleLight;
    uniform vec3 uCandles[3];
    uniform mediump float uGlow;
    uniform float uMaxPointSize;
    uniform mediump float uMaterial;
    uniform float uHeart;
    uniform mediump float uDuck;
    uniform float uReveal;
    uniform float uHover;
    uniform vec2 uPointer;
    varying vec3 vColor;
    varying float vAlpha;
    varying float vSeed;
    void main() {
      vec3 position = aPosition;
      float cosine = cos(uRotation), sine = sin(uRotation);
      position.xz = mat2(cosine, -sine, sine, cosine) * position.xz;
      cosine = cos(uTilt); sine = sin(uTilt);
      position.yz = mat2(cosine, -sine, sine, cosine) * position.yz;
      float depth = 9.4 - position.z;
      vec2 projected = position.xy * uScale / depth;
      gl_Position = vec4(projected.x / uAspect, projected.y + uYOffset, uMaterial * clamp((depth - 9.4) / 10.0, -0.98, 0.98), 1.0);
      float perspectiveSize = (uScreenHeight / 820.0) * 9.4 / depth;
      gl_PointSize = clamp(aSize * 2.0 * uPixelRatio * perspectiveSize, 1.2, 54.0);
      if (uGlow > 0.5) gl_PointSize = clamp(aSize * uScale * uScreenHeight * uPixelRatio / depth, 1.2, uMaxPointSize);
      float twinkle = 0.80 + 0.20 * sin(uTime * (0.8 + aSeed) * (1.0-uStill) + aSeed * 61.0);
      float pearl = smoothstep(0.50, 0.95, aColor.g);
      vec3 coldColor = mix(vec3(0.48, 0.52, 0.65), vec3(0.80, 0.82, 0.90), pearl);
      vec3 warmColor = mix(vec3(0.66, 0.52, 0.43), vec3(0.95, 0.83, 0.72), pearl);
      vColor = mix(aColor, mix(coldColor, warmColor, uWarm * 0.10), uAtmosphere);
      vec3 heartColor = mix(vec3(0.80, 0.10, 0.32), vec3(1.0, 0.52, 0.64), smoothstep(-1.8, 1.7, aPosition.y) * 0.65 + aSeed * 0.35);
      if (aSeed > 0.965) heartColor = mix(heartColor, vec3(1.0, 0.80, 0.61), 0.68);
      vColor = mix(vColor, heartColor, uHeart);
      float rounding = 0.64 + 0.36 * smoothstep(-0.70, 1.05, aPosition.z);
      float sheen = exp(-dot(aPosition.xy - vec2(-0.55, 0.65), aPosition.xy - vec2(-0.55, 0.65)) * 1.6);
      vColor *= mix(1.0, rounding, uHeart);
      vColor += uHeart * sheen * vec3(0.17, 0.095, 0.09);
      float nearest = min(distance(aPosition, uCandles[0]), min(distance(aPosition, uCandles[1]), distance(aPosition, uCandles[2])));
      float illumination = uCandleLight * exp(-nearest * nearest * 1.15);
      vColor = mix(vColor, vec3(1.0, 0.78, 0.50), illumination * 0.62);
      vColor += illumination * vec3(0.28, 0.13, 0.035);
      gl_PointSize *= 1.0 + illumination * 0.12;
      float hoverLight = uHover * exp(-dot(position.xy * 9.4 / depth - uPointer, position.xy * 9.4 / depth - uPointer) * 2.2);
      vColor = mix(vColor, vec3(1.0, 0.87, 0.78), hoverLight * 0.28);
      gl_PointSize *= (1.0 - uMaterial * 0.13) * (1.0 + hoverLight * 0.85) * (1.0 + uHeart * 0.22);
      gl_PointSize *= 1.0 + uDuck * 0.38;
      vAlpha = twinkle * uOpacity * clamp(1.15 - (depth - 6.0) * 0.07, 0.25, 1.0);
      vAlpha = min(1.0, vAlpha * (1.0 + uDuck * 0.16));
      vAlpha *= smoothstep(aSeed * 0.78, aSeed * 0.78 + 0.20, uReveal);
      vSeed = aSeed;
    }
  `;
  const fragmentSource = `
    precision mediump float;
    varying vec3 vColor;
    varying float vAlpha;
    varying float vSeed;
    uniform mediump float uGlow;
    uniform mediump float uMaterial;
    void main() {
      vec2 point = gl_PointCoord - 0.5;
      float distance = length(point);
      if (distance > 0.5) discard;
      if (uGlow > 0.5) {
        float glow = max(0.0, exp(-distance * distance * 18.0) - exp(-4.5));
        vec3 glowColor = mix(vColor, vec3(1.0, 0.85, 0.62), exp(-distance * distance * 50.0));
        gl_FragColor = vec4(glowColor, glow * vAlpha);
        return;
      }
      float core = exp(-distance * distance * 32.0) * 1.22;
      float halo = exp(-distance * distance * 11.0) * 0.28;
      float sparkle = 0.0;
      if (vSeed > 0.975) {
        sparkle = (exp(-abs(point.x)*55.0)*exp(-abs(point.y)*7.0) + exp(-abs(point.y)*55.0)*exp(-abs(point.x)*7.0)) * 0.16;
      }
      float alpha = (core + halo + sparkle) * vAlpha;
      if (uMaterial > 0.5 && alpha < 0.045) discard;
      gl_FragColor = vec4(vColor * 1.18, alpha);
    }
  `;

  function createShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error("Shader compilation failed");
    return shader;
  }
  let program;
  try {
    program = gl.createProgram();
    gl.attachShader(program, createShader(gl.VERTEX_SHADER, vertexSource));
    gl.attachShader(program, createShader(gl.FRAGMENT_SHADER, fragmentSource));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error("Shader link failed");
  } catch {
    showGraphicsError("浏览器的图形着色器没有成功启动。请更新浏览器后重试，或先读生日信。");
    return;
  }
  gl.useProgram(program);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
  gl.disable(gl.DEPTH_TEST);
  gl.clearColor(0, 0, 0, 0);
  const uniforms = {};
  for (const key of ["Time", "Rotation", "Tilt", "Aspect", "Scale", "YOffset", "PixelRatio", "Warm", "Atmosphere", "Opacity", "ScreenHeight", "Still", "CandleLight", "Glow", "MaxPointSize", "Material", "Heart", "Duck", "Reveal", "Hover", "Pointer"]) {
    uniforms[key] = gl.getUniformLocation(program, `u${key}`);
  }
  gl.uniform1f(uniforms.MaxPointSize, Math.min(512, gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE)[1]));
  const attributes = {};
  for (const key of ["Position", "Color", "Size", "Seed"]) attributes[key] = gl.getAttribLocation(program, `a${key}`);

  function makeCloud(total) {
    const cloud = { total, positions: new Float32Array(total * 3), colors: new Float32Array(total * 3), sizes: new Float32Array(total), seeds: new Float32Array(total), buffers: {} };
    for (let index = 0; index < total; index++) cloud.seeds[index] = Math.random();
    for (const key of ["positions", "colors", "sizes", "seeds"]) cloud.buffers[key] = gl.createBuffer();
    cloud.upload = () => {
      for (const key of ["positions", "colors", "sizes", "seeds"]) {
        gl.bindBuffer(gl.ARRAY_BUFFER, cloud.buffers[key]);
        gl.bufferData(gl.ARRAY_BUFFER, cloud[key], key === "positions" ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW);
      }
    };
    return cloud;
  }

  const cake = makeCloud(count);
  const cakeTarget = new Float32Array(count * 3);
  const heartTarget = new Float32Array(count * 3);
  const duckTarget = new Float32Array(count * 3);
  const duckColors = new Float32Array(count * 3);
  const velocities = new Float32Array(count * 3);
  const scatter = new Float32Array(count * 3);
  const fireworkVelocity = new Float32Array(count * 3);
  const fireworkCenter = new Float32Array(count * 3);
  const cakeColors = new Float32Array(count * 3);
  const stars = makeCloud(starCount);
  const orbit = makeCloud(1250);
  const flames = makeCloud(flameCount);
  const giftSeal = makeCloud(950);
  for (let index = 0; index < giftSeal.total; index++) {
    let point;
    if (index < 700) {
      const axis = index % 3, corner = Math.floor(index / 3) % 4;
      point = [0, 0, 0];
      point[axis] = random(-1, 1);
      point[(axis + 1) % 3] = corner & 1 ? 1 : -1;
      point[(axis + 2) % 3] = corner & 2 ? 1 : -1;
      point = point.map((value, key) => value * [0.43, 0.32, 0.26][key] + (key === 1 ? 0.1 : 0));
    } else if (index < 840) {
      const along = random(-1, 1);
      point = index % 2 ? [0, 0.1 + along * 0.32, 0.27] : [along * 0.43, 0.13, 0.27];
    } else {
      const side = index % 2 ? -1 : 1, angle = random(0, Math.PI * 2);
      point = [side * (0.15 + Math.cos(angle) * 0.16), 0.49 + Math.sin(angle) * 0.12, Math.sin(angle) * 0.025];
    }
    giftSeal.positions.set(point, index * 3);
    giftSeal.colors.set(index < 700 ? [0.97, 0.81, 0.59] : [0.96, 0.52, 0.62], index * 3);
    giftSeal.sizes[index] = random(0.85, 1.65);
  }
  giftSeal.upload();
  const firstHalo = makeCloud(1);
  firstHalo.positions.set([0, 0.2, 0]);
  firstHalo.colors.set([0.8, 0.60, 0.38]);
  firstHalo.sizes[0] = 1.1;
  firstHalo.upload();
  const resonance = makeCloud(640);
  for (let index = 0; index < resonance.total; index++) {
    const angle = index / resonance.total * Math.PI * 2;
    resonance.positions.set([Math.cos(angle) * 2.36, Math.sin(angle) * 1.80 + 0.12, -0.5], index * 3);
    resonance.colors.set(index % 3 === 0 ? [0.95, 0.65, 0.44] : [0.88, 0.26, 0.48], index * 3);
    resonance.sizes[index] = random(0.7, 1.4);
  }
  resonance.upload();
  const candles = [{ x: -0.55, z: 0.16, height: 0.64 }, { x: 0, z: -0.32, height: 0.92 }, { x: 0.55, z: 0.12, height: 0.72 }];
  const candleHalos = makeCloud(candles.length);
  const candlePositions = new Float32Array(candles.flatMap((candle) => [candle.x, 1.08 + candle.height, candle.z]));
  gl.uniform3fv(gl.getUniformLocation(program, "uCandles[0]"), candlePositions);
  candles.forEach((candle, index) => {
    candleHalos.positions.set([candle.x, 1.08 + candle.height, candle.z], index * 3);
    candleHalos.colors.set([1, 0.58, 0.25], index * 3);
    candleHalos.sizes[index] = 1.55;
  });
  candleHalos.upload();
  const palette = [[0.93, 0.67, 0.64], [0.95, 0.83, 0.72], [0.76, 0.64, 0.83], [0.9, 0.74, 0.66], [0.63, 0.7, 0.91]];
  const tierPalette = [
    { body: [0.77, 0.22, 0.42], accent: [0.98, 0.56, 0.43], cream: [1, 0.71, 0.59], bead: [0.97, 0.37, 0.55] },
    { body: [0.43, 0.32, 0.77], accent: [0.70, 0.51, 0.90], cream: [0.78, 0.72, 1], bead: [0.55, 0.70, 1] },
    { body: [0.17, 0.64, 0.53], accent: [0.45, 0.83, 0.65], cream: [0.84, 0.90, 0.65], bead: [1, 0.79, 0.43] },
  ];
  const mixColor = (first, second, amount) => first.map((value, channel) => value + (second[channel] - value) * amount);

  function sphere(radius) {
    const azimuth = random(0, Math.PI * 2);
    const vertical = random(-1, 1);
    const radial = Math.sqrt(1 - vertical * vertical) * radius;
    return [Math.cos(azimuth) * radial, vertical * radius, Math.sin(azimuth) * radial];
  }

  function ellipsoid(center, radii) {
    const direction = sphere(random(0.985, 1.015));
    return direction.map((value, axis) => center[axis] + value * radii[axis]);
  }
  function insideEllipsoid(point, center, radii) {
    return point.reduce((sum, value, axis) => sum + Math.pow((value - center[axis]) / radii[axis], 2), 0) < 0.98;
  }
  function makeDuckParticle(index) {
    const part = index / count;
    const bodyCenter = [0, -0.65, -0.08], bodyRadii = [0.87, 0.77, 0.78];
    const headCenter = [0, 0.63, 0.13], headRadii = [1.10, 1.00, 0.91];
    // Keep the expression in front of the rounded head shell at every yaw.
    const faceDepth = (x, y) => headCenter[2] + headRadii[2] * Math.sqrt(Math.max(0, 1 - (x / headRadii[0]) ** 2 - ((y - headCenter[1]) / headRadii[1]) ** 2));
    let point, color;
    if (part < 0.69) {
      const head = part >= 0.27;
      do {
        point = ellipsoid(head ? headCenter : bodyCenter, head ? headRadii : bodyRadii);
      } while (insideEllipsoid(point, head ? bodyCenter : headCenter, head ? bodyRadii : headRadii));
      const front = clamp((point[2] + 0.8) / 1.8, 0, 1);
      color = head ? mixColor([1, 0.81, 0.31], [1, 0.96, 0.70], front * 0.85) : mixColor([1, 0.73, 0.21], [1, 0.92, 0.55], front * 0.85);
    } else if (part < 0.76) {
      const side = part < 0.725 ? -1 : 1;
      point = ellipsoid([side * 0.81, -0.60, 0.18], [0.20, 0.34, 0.37]);
      point[0] -= side * (point[1] + 0.60) * 0.16;
      color = mixColor([1, 0.73, 0.25], [1, 0.91, 0.55], Math.random() * 0.55);
    } else if (part < 0.78) {
      point = ellipsoid([0, -0.63, -0.81], [0.30, 0.24, 0.37]);
      point[1] += Math.max(0, -point[2] - 0.81) * 0.45;
      color = [1, 0.85, 0.43];
    } else if (part < 0.82) {
      const side = part < 0.80 ? -1 : 1;
      point = ellipsoid([side * 0.35, -1.37, 0.28], [0.26, 0.10, 0.31]);
      color = mixColor([0.98, 0.48, 0.12], [1, 0.72, 0.31], Math.random());
    } else if (part < 0.88) {
      point = ellipsoid([0, 0.40, 1.065], [0.34, 0.145, 0.26]);
      color = point[1] > 0.40 ? [1, 0.70, 0.28] : [0.98, 0.50, 0.13];
    } else if (part < 0.888) {
      const x = random(-0.26, 0.26), y = 0.365 + 0.045 * Math.pow(x / 0.26, 2);
      point = [x, y + random(-0.007, 0.007), 1.065 + 0.26 * Math.sqrt(Math.max(0, 1 - Math.pow(x / 0.34, 2) - Math.pow((y - 0.40) / 0.145, 2))) + 0.012];
      color = [0.49, 0.25, 0.09];
    } else if (part < 0.928) {
      const side = part < 0.908 ? -1 : 1;
      point = ellipsoid([side * 0.64, 0.48, 0], [0.18, 0.11, 0.014]);
      point[2] += faceDepth(point[0], point[1]) + 0.027;
      color = mixColor([1, 0.52, 0.48], [1, 0.69, 0.60], Math.random());
    } else if (part < 0.978) {
      const side = part < 0.953 ? -1 : 1;
      point = ellipsoid([side * 0.38, 0.80, 0], [0.145, 0.185, 0.018]);
      point[2] += faceDepth(point[0], point[1]) + 0.035;
      color = [0.075, 0.045, 0.038];
    } else if (part < 0.989) {
      const side = part < 0.9835 ? -1 : 1;
      const small = index % 4 === 0;
      point = ellipsoid([side * 0.38 + (small ? 0.043 : -0.040), small ? 0.74 : 0.865, 0], small ? [0.024, 0.025, 0.008] : [0.049, 0.056, 0.009]);
      point[2] += faceDepth(point[0], point[1]) + 0.066;
      color = [1, 0.99, 0.89];
    } else {
      const along = Math.random(), strand = index % 2;
      const angle = random(0, Math.PI * 2), radius = 0.060 * (1 - along * 0.8);
      point = [-0.12 + strand * 0.12 + Math.sin(along * 2.2) * 0.14 + Math.cos(angle) * radius,
        1.54 + Math.sin(along * 1.6) * (0.24 - strand * 0.065), 0.13 + Math.sin(angle) * radius];
      color = [1, 0.93, 0.59];
    }
    duckTarget.set(point, index * 3);
    duckColors.set(color, index * 3);
  }
  const cakeHat = makeCloud(innerWidth < 600 ? 2700 : 4200);
  const hatTarget = new Float32Array(cakeHat.total * 3);
  for (let index = 0; index < cakeHat.total; index++) {
    const part = index / cakeHat.total;
    let point, color;
    if (part < 0.58) {
      const along = 1 - Math.sqrt(Math.random()), angle = random(0, Math.PI * 2);
      const radius = 0.61 * (1 - along);
      point = [Math.cos(angle) * radius, 1.57 + along * 1.25, Math.sin(angle) * radius];
      const front = (Math.sin(angle) + 1) * 0.5;
      color = mixColor([0.74, 0.24, 0.44], [1, 0.65, 0.78], front * 0.45 + Math.random() * 0.40);
      if (index % 13 === 0) color = [1, 0.87, 0.90];
    } else if (part < 0.68) {
      const along = Math.random(), angle = along * Math.PI * 6 + (index % 2) * Math.PI;
      const radius = 0.61 * (1 - along) + 0.009;
      point = [Math.cos(angle) * radius, 1.57 + along * 1.25, Math.sin(angle) * radius];
      color = index % 2 ? [0.99, 0.78, 0.87] : [0.59, 0.23, 0.42];
    } else if (part < 0.82) {
      const strand = index % 64, angle = strand / 64 * Math.PI * 2;
      const along = Math.random(), radius = 0.57 + along * (0.12 + (strand % 4) * 0.025);
      point = [Math.cos(angle) * radius, 1.57 + Math.sin(along * Math.PI) * 0.04 + along * (strand % 3 === 0 ? 0.23 : 0.08), Math.sin(angle) * radius];
      color = [[0.94, 0.90, 1], [1, 0.67, 0.81], [0.82, 0.80, 0.94]][strand % 3];
    } else if (part < 0.94) {
      const star = index % 9, angle = star / 9 * Math.PI * 2;
      const edge = Math.floor(random(0, 10)), blend = Math.random();
      const a = Math.PI / 2 + edge * Math.PI / 5, b = a + Math.PI / 5;
      const ra = edge % 2 ? 0.045 : 0.11, rb = edge % 2 ? 0.11 : 0.045;
      const fill = Math.sqrt(random(0.30, 1));
      const starX = (Math.cos(a) * ra * (1 - blend) + Math.cos(b) * rb * blend) * fill;
      const starY = (Math.sin(a) * ra * (1 - blend) + Math.sin(b) * rb * blend) * fill;
      point = [Math.cos(angle) * 0.63 - Math.sin(angle) * starX,
        1.72 + Math.sin(angle * 2) * 0.055 + starY, Math.sin(angle) * 0.63 + Math.cos(angle) * starX];
      color = star % 2 ? [1, 0.73, 0.84] : [0.94, 0.93, 1];
    } else {
      point = ellipsoid([0, 2.87, 0], [0.135, 0.15, 0.135]);
      const fluff = random(0, 0.025);
      point = point.map((value, axis) => value + (value - [0, 2.87, 0][axis]) * fluff * 5);
      color = mixColor([0.89, 0.25, 0.49], [1, 0.63, 0.78], Math.random());
    }
    // The reference is a conical party hat, worn at a slight angle.
    const localY = point[1] - 1.57, localX = point[0];
    point[0] = localX * Math.cos(0.21) - localY * Math.sin(0.21) - 0.04;
    point[1] = localX * Math.sin(0.21) + localY * Math.cos(0.21) + 1.57;
    cakeHat.positions.set(point, index * 3);
    hatTarget.set(point, index * 3);
    cakeHat.colors.set(color, index * 3);
    cakeHat.sizes[index] = random(0.9, 1.85);
  }
  cakeHat.upload();
  const heartDepthSquared = (x, y) => 1 - x * x - y * y + Math.cbrt(x * x + 0.008) * y;

  for (let index = 0; index < count; index++) {
    const offset = index * 3;
    const selector = Math.random();
    let point;
    let color = palette[Math.floor(random(0, palette.length))];
    let size = random(1.0, 3.1);
    if (selector < 0.62) {
      const tier = selector < 0.27 ? 0 : selector < 0.47 ? 1 : 2;
      const radius = [2.0, 1.49, 0.99][tier];
      const bottom = [-1.12, -0.39, 0.29][tier];
      const tierHeight = [0.73, 0.68, 0.62][tier];
      const angle = random(0, Math.PI * 2);
      let radial = radius + random(-0.017, 0.017);
      let vertical = bottom + random(0, tierHeight);
      if (Math.random() < 0.28) { radial *= Math.sqrt(Math.random()); vertical = bottom + tierHeight + random(-0.018, 0.018); }
      const ribbing = Math.sin(angle * 47) * 0.013;
      point = [Math.cos(angle) * (radial + ribbing), vertical, Math.sin(angle) * (radial + ribbing)];
      const tones = tierPalette[tier];
      const gradient = 0.28 + 0.34 * (vertical - bottom) / tierHeight + Math.sin(angle * 3 + vertical * 6) * 0.14;
      color = vertical > bottom + tierHeight - 0.10 ? mixColor(tones.cream, tones.accent, 0.25) : mixColor(tones.body, tones.accent, gradient);
      size = random(0.9, 2.35);
    } else if (selector < 0.79) {
      const tier = Math.floor(random(0, 3));
      const radius = [2.0, 1.49, 0.99][tier];
      const top = [-0.39, 0.29, 0.91][tier];
      const angle = random(0, Math.PI * 2);
      const scallop = Math.sin(angle * [16, 13, 10][tier]);
      const isLower = Math.random() < 0.26;
      const vertical = isLower ? top - [0.73, 0.68, 0.62][tier] + 0.035 : top - 0.07 - 0.095 * (0.5 + scallop * 0.5);
      const radial = radius + 0.035 + random(-0.027, 0.027);
      point = [radial * Math.cos(angle), vertical + random(-0.021, 0.021), radial * Math.sin(angle)];
      color = mixColor(tierPalette[tier].cream, tierPalette[tier].accent, 0.25 + 0.18 * scallop);
      size = random(1.25, 3.0);
    } else if (selector < 0.9) {
      const tier = Math.floor(random(0, 3));
      const radius = [1.91, 1.41, 0.91][tier];
      const top = [-0.38, 0.30, 0.92][tier];
      const beads = [25, 19, 13][tier];
      const beadAngle = Math.floor(random(0, beads)) / beads * Math.PI * 2;
      const bead = sphere(tier === 0 ? 0.075 : 0.065);
      point = [Math.cos(beadAngle) * radius + bead[0], top + 0.035 + bead[1], Math.sin(beadAngle) * radius + bead[2]];
      color = Math.random() < 0.65 ? tierPalette[tier].bead : [1, 0.79, 0.43];
      size = random(1.3, 3.0);
    } else if (selector < 0.945) {
      const angle = random(0, Math.PI * 2);
      const radius = random(2.11, 2.29);
      point = [radius * Math.cos(angle), -1.2 + random(-0.015, 0.015), radius * Math.sin(angle)];
      color = [0.7, 0.68, 0.87];
      size = random(1.1, 2.5);
    } else {
      const candle = candles[Math.floor(random(0, candles.length))];
      const angle = random(0, Math.PI * 2);
      const along = Math.random();
      point = [candle.x + Math.cos(angle) * 0.065, 0.98 + candle.height * along, candle.z + Math.sin(angle) * 0.065];
      color = Math.sin(angle + along * 39) > 0.4 ? [0.93, 0.54, 0.57] : [0.98, 0.9, 0.77];
      size = random(1.1, 2.5);
    }
    for (let axis = 0; axis < 3; axis++) {
      cakeTarget[offset + axis] = point[axis];
      cake.positions[offset + axis] = axis === 1 ? 0.2 : 0;
      cake.colors[offset + axis] = color[axis];
      cakeColors[offset + axis] = color[axis];
    }
    cake.sizes[index] = size;
    const angle = random(0, Math.PI * 2);
    const radius = random(2.5, 7.5);
    scatter[offset] = Math.cos(angle) * radius;
    scatter[offset + 1] = random(-4.5, 4.5);
    scatter[offset + 2] = Math.sin(angle) * radius;
    const burst = Math.floor(cake.seeds[index] * 5);
    const burstAngle = burst / 5 * Math.PI * 2;
    const speed = sphere(random(0.7, 3.3));
    fireworkCenter[offset] = Math.cos(burstAngle) * 2.4;
    fireworkCenter[offset + 1] = Math.sin(burstAngle) * 1.1 + 0.4;
    fireworkCenter[offset + 2] = Math.sin(burstAngle) * 0.5;
    fireworkVelocity.set(speed, offset);
    let heartX, heartY;
    do {
      heartX = random(-1.2, 1.2);
      heartY = random(-1.0, 1.3);
    } while (heartDepthSquared(heartX, heartY) <= 0);
    if (index % 8 === 0) {
      let inner = 1, outer = 4;
      for (let step = 0; step < 10; step++) {
        const middle = (inner + outer) / 2;
        if (heartDepthSquared(heartX * middle, heartY * middle) > 0) inner = middle;
        else outer = middle;
      }
      heartX *= inner * 0.996;
      heartY *= inner * 0.996;
    }
    const depth = Math.sqrt(Math.max(0, heartDepthSquared(heartX, heartY))) * 0.98;
    heartTarget[offset] = heartX * 1.82;
    heartTarget[offset + 1] = heartY * 1.50 - 0.10;
    heartTarget[offset + 2] = index % 6 === 0 ? random(-depth, depth) : (index % 2 ? 1 : -1) * depth * random(0.985, 1.0);
    makeDuckParticle(index);
  }
  cake.upload();
  activeTarget = cakeTarget;

  for (let index = 0; index < starCount; index++) {
    const offset = index * 3;
    stars.positions[offset] = random(-19, 19);
    stars.positions[offset + 1] = random(-13, 13);
    stars.positions[offset + 2] = random(-14, -2);
    const tint = Math.random();
    stars.colors.set(tint < 0.23 ? [0.87, 0.64, 0.58] : [0.52, 0.57, 0.76], offset);
    stars.sizes[index] = Math.random() > 0.982 ? random(5, 10) : random(0.8, 3.0);
  }
  stars.upload();
  for (let index = 0; index < orbit.total; index++) {
    const offset = index * 3;
    const angle = random(0, Math.PI * 2);
    const radius = index < 700 ? random(2.9, 3.13) : random(3.7, 4.5);
    orbit.positions.set([Math.cos(angle) * radius, -0.7 + Math.sin(angle) * 0.22 + random(-0.02, 0.02), Math.sin(angle) * radius], offset);
    orbit.colors.set(index < 700 ? [0.53, 0.42, 0.57] : [0.35, 0.39, 0.6], offset);
    orbit.sizes[index] = random(0.7, 1.7);
  }
  orbit.upload();
  for (let index = 0; index < flameCount; index++) {
    flames.colors.set(index % 4 === 0 ? [1, 0.39, 0.1] : index % 5 === 0 ? [0.6, 0.55, 1] : [1, 0.78, 0.35], index * 3);
    flames.sizes[index] = random(2.0, 5.7);
  }
  flames.upload();

  function makeText(text, maxWidth, isName = false) {
    const surface = document.createElement("canvas");
    surface.width = 1200;
    surface.height = 430;
    const context = surface.getContext("2d", { willReadFrequently: true });
    const chars = Array.from(text);
    let lines = [text];
    if (chars.length > 6) lines = [chars.slice(0, Math.ceil(chars.length / 2)).join(""), chars.slice(Math.ceil(chars.length / 2)).join("")];
    const fontSize = lines.length > 1 ? 154 : 190;
    context.font = `500 ${fontSize}px "Songti SC", "STSong", "SimSun", serif`;
    context.fillStyle = "white";
    context.textAlign = "center";
    context.textBaseline = "middle";
    lines.forEach((line, index) => context.fillText(line, 600, lines.length > 1 ? 120 + index * 183 : 225, 1090));
    const pixels = context.getImageData(0, 0, surface.width, surface.height).data;
    const points = [];
    for (let vertical = 10; vertical < surface.height - 10; vertical += 3) {
      for (let horizontal = 20; horizontal < surface.width - 20; horizontal += 3) {
        if (pixels[(vertical * surface.width + horizontal) * 4 + 3] > 100) points.push([horizontal, vertical]);
      }
    }
    if (!points.length) points.push([600, 225]);
    let minX = 1200, maxX = 0;
    for (const point of points) { minX = Math.min(minX, point[0]); maxX = Math.max(maxX, point[0]); }
    const scale = Math.min(maxWidth / Math.max(maxX - minX, 1), 0.013);
    const result = new Float32Array(count * 3);
    for (let index = 0; index < count; index++) {
      const point = points[Math.floor(Math.random() * points.length)];
      result[index * 3] = (point[0] - (minX + maxX) / 2) * scale + random(-0.012, 0.012);
      result[index * 3 + 1] = (225 - point[1]) * scale + (isName ? 0.35 : 0.1) + random(-0.012, 0.012);
      result[index * 3 + 2] = random(-0.13, 0.13);
    }
    return result;
  }
  const greetingTarget = makeText("生日快乐", 7.3);
  nameTarget = makeText(gift.to, 7.0, true);

  function resize() {
    width = innerWidth;
    height = innerHeight;
    pixelRatio = Math.min(devicePixelRatio || 1, width < 600 ? 1.7 : 1.8);
    canvas.width = Math.floor(width * pixelRatio);
    canvas.height = Math.floor(height * pixelRatio);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform1f(uniforms.Aspect, width / height);
    gl.uniform1f(uniforms.PixelRatio, pixelRatio);
    gl.uniform1f(uniforms.ScreenHeight, height);
    updateSceneFrame();
  }
  addEventListener("resize", resize);
  resize();

  const narratives = {
    welcome: ["A LITTLE SURPRISE, JUST FOR YOU", "<span data-recipient></span>，<br><em>这份惊喜，只给你。</em>", "把想对你说的话，悄悄藏成了一份生日礼物。", "拆开为你准备的礼物", 0],
    birth: ["CHAPTER 01 · TODAY IS ALL ABOUT YOU", "今天的主角，<br>是<em><span data-recipient></span>。</em>", "先为你戴好生日帽，接下来都是为你准备的惊喜。", "你的生日惊喜正在展开…", 0],
    duck: ["CHAPTER 01 · HAPPY BIRTHDAY, LITTLE DUCK", "生日帽戴好啦，<br><em>今天，你是主角。</em>", "愿你被爱包围，也一直保有可可爱爱的自己。", "看看为你准备的心意", 0],
    cake: ["CHAPTER 03 · A LITTLE SWEETNESS FOR YOU", "这份甜，<br><em>是为你准备的。</em>", "愿新的一岁，有人分享快乐，也有人接住心事。", "听听给你的生日祝福", 2],
    heart: ["A LITTLE MAGIC · IN RESONANCE", "有些心意，<br><em>想让你亲眼看见。</em>", "把想送给你的温柔，汇成一颗同频跳动的心。", "把心意变回蛋糕", 1],
    returning: ["EVERY LITTLE BEAT, A WISH FOR YOU", "把这份心意，<br>做成<em>给你的生日蛋糕。</em>", "想把所有甜甜的祝福，都送给今天的你。", "心意正在汇聚…", 1],
    greeting: ["CHAPTER 03 · A BIRTHDAY MESSAGE FOR YOU", "<span data-recipient></span>，生日快乐。<br><em>庆幸在人海和你相遇。</em>", "愿你的每一个平凡日子，都有小小的惊喜。", "回到蛋糕，点亮心愿", 2],
    candle: ["CHAPTER 03 · A LIGHT ONLY FOR YOU", "给今天的你，<br><em>点一盏温柔的灯。</em>", "生日蜡烛已备好，愿你心里的光一直亮着。", "点亮生日蜡烛", 2],
    wish: ["CHAPTER 04 · MAKE A LITTLE WISH", "闭上眼睛，<br>许一个<em>只属于你的愿望。</em>", "点击「吹灭蜡烛」，让麦克风听见你轻轻的呼气。", "", 3],
    finale: ["YOUR WISH IS ON ITS WAY", "愿望已经出发，<br><em>美好正在向你靠近。</em>", "愿这一口轻轻的呼气，带走烦恼，留下好运。", "", 4],
    letter: ["CHAPTER 05 · A LITTLE LETTER FOR YOU", "愿你新的一岁，<br><em>一直被温柔以待。</em>", "这封写给你的生日祝福，现在可以拆开了。", "再拆一次礼物", 4],
  };

  function setNarrative(next, instant = false) {
    const data = narratives[next];
    clearTimeout(storyTimer);
    const apply = () => {
      element("eyebrow").replaceChildren();
      const left = document.createElement("span");
      const right = document.createElement("span");
      element("eyebrow").append(left, document.createTextNode(data[0]), right);
      element("headline").innerHTML = data[1];
      element("headline").querySelectorAll("[data-recipient]").forEach(node => { node.textContent = gift.to; });
      element("subtitle").textContent = data[2];
      element("story").classList.remove("changing");
      requestAnimationFrame(updateSceneFrame);
    };
    if (instant || reduced) apply();
    else { element("story").classList.add("changing"); storyTimer = setTimeout(apply, 280); }
    element("primary-label").textContent = data[3];
    if (next === "duck" && !duckHatReady) element("primary-label").textContent = "正在为你戴上生日帽…";
    if (next === "heart" && magicFromDuck) element("primary-label").textContent = "把心意变成生日蛋糕";
    element("primary").hidden = ["wish", "finale"].includes(next);
    element("primary").disabled = ["birth", "returning"].includes(next) || next === "duck" && !duckHatReady;
    element("magic").hidden = !["cake", "candle"].includes(next);
    element("resonance-note").hidden = !["heart", "returning"].includes(next);
    element("resonance-label").textContent = next === "returning" ? "把同频的心意，藏回星光里" : "星光正在寻找同一个频率…";
    interactionSurface.setAttribute("aria-label", next === "welcome" ? "靠近或轻触粒子礼盒，拆开送给小鸭的神秘礼物" : ["birth", "duck"].includes(next) ? "收礼的粒子小鸭，登场后戴上粉色尖顶生日帽，可以旋转和触碰" : next === "heart" ? "可以拖动、触碰的饱满粒子爱心" : "拖动旋转、触碰扰动粒子蛋糕");
    element("skip").hidden = next !== "birth";
    element("hold").hidden = next !== "wish";
    element("microphone").hidden = next !== "wish";
    element("manual-blow").hidden = next !== "wish";
    element("keepsake").hidden = next !== "letter";
    element("letter").hidden = next !== "letter";
    element("action-hint").hidden = ["wish", "letter", "finale", "heart", "returning"].includes(next);
    if (next === "candle") element("action-hint").textContent = "每一盏灯，都藏着一句「愿你快乐」";
    else if (next === "duck") element("action-hint").textContent = "轻轻碰一碰，再看看为你准备的心意";
    else if (next === "cake") element("action-hint").textContent = "悬停拨动星光，拖动唤醒祝福";
    else if (next === "greeting") element("action-hint").textContent = "祝福已收到，还有一个愿望在等你";
    else if (next === "welcome") element("action-hint").textContent = "靠近礼盒，或轻触拆开";
    else element("action-hint").textContent = "戴上耳机，把这一刻留给自己";
    document.querySelectorAll("[data-chapter]").forEach((chapter) => {
      const index = Number(chapter.dataset.chapter);
      chapter.classList.toggle("active", index === data[4]);
      chapter.classList.toggle("done", index < data[4]);
      if (index === data[4]) chapter.setAttribute("aria-current", "step");
      else chapter.removeAttribute("aria-current");
    });
  }

  function setPhase(next, instant = false) {
    cancelHold();
    if (next === "heart") {
      magicFromDuck = phase === "duck";
      if (magicFromDuck) magicReturnPhase = "cake";
    }
    phase = next;
    phaseStart = performance.now();
    document.body.dataset.phase = next;
    if (next === "duck") {
      duckHatReady = reduced;
      document.body.dataset.hat = reduced ? "ready" : "arriving";
    } else {
      duckHatReady = false;
      delete document.body.dataset.hat;
    }
    if (!["heart", "returning"].includes(next)) delete document.body.dataset.magic;
    else {
      document.body.dataset.magic = next === "heart" ? "gathering" : "returning";
      pointer.present = false;
      pointer.power = 0;
    }
    setNarrative(next, instant);
    if (next !== "wish") {
      stopMicrophone();
      element("mic-status").hidden = true;
    }
    document.documentElement.style.setProperty("--warm", ["wish", "finale", "letter"].includes(next) ? "1" : "0");
    if (["welcome", "birth", "duck"].includes(next)) activeTarget = duckTarget;
    if (["cake", "candle", "wish", "returning"].includes(next)) activeTarget = cakeTarget;
    if (next === "heart") { activeTarget = heartTarget; chime(1); }
    if (next === "greeting") { activeTarget = greetingTarget; chime(1); }
    if (next === "wish") { chime(2); document.documentElement.style.setProperty("--warm", "1"); }
    if (next === "finale") { chime(3); activeTarget = nameTarget; }
    if (next === "letter") activeTarget = nameTarget;
    if (next === "finale") {
      const burstColors = [[1, 0.77, 0.39], [1, 0.48, 0.62], [0.7, 0.5, 1], [0.38, 0.84, 0.88], [1, 0.85, 0.65]];
      for (let index = 0; index < count; index++) cake.colors.set(burstColors[Math.floor(cake.seeds[index] * 5)], index * 3);
    } else cake.colors.set(["birth", "duck"].includes(next) || next === "heart" && magicFromDuck ? duckColors : cakeColors);
    gl.bindBuffer(gl.ARRAY_BUFFER, cake.buffers.colors);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, cake.colors);
    requestAnimationFrame(updateSceneFrame);
  }

  function startGift(playAudio = true) {
    started = true;
    if (playAudio) startAudio();
    warmed = 0;
    introHover = 0;
    rotationVelocity = 0;
    rotation = 0.20;
    tilt = -0.04;
    dragTotal = 0;
    document.documentElement.style.setProperty("--warm", "0");
    setPhase(reduced ? "duck" : "birth");
    if (reduced) {
      cake.positions.set(duckTarget);
      velocities.fill(0);
    } else {
      cake.positions.fill(0);
      for (let index = 0; index < count; index++) cake.positions[index * 3 + 1] = 0.2;
      velocities.fill(0);
    }
  }
  element("magic").addEventListener("click", () => {
    if (!["cake", "candle"].includes(phase)) return;
    magicReturnPhase = phase;
    startAudio();
    setPhase("heart");
  });
  element("primary").addEventListener("click", () => {
    if (started) startAudio();
    if (phase === "welcome" || phase === "letter") startGift();
    else if (phase === "duck") setPhase("heart");
    else if (phase === "cake") setPhase("greeting");
    else if (phase === "greeting") setPhase("candle");
    else if (phase === "candle") setPhase("wish");
    else if (phase === "heart") setPhase("returning");
  });
  element("skip").addEventListener("click", () => { startAudio(); setPhase("duck"); chime(0); });
  element("brand").addEventListener("click", (event) => {
    event.preventDefault();
    rotation = 0.24;
    tilt = -0.13;
    rotationVelocity = 0;
    warmed = 0;
    document.documentElement.style.setProperty("--warm", "0");
    setPhase("welcome");
  });

  function sceneScale() {
    return projection.scale;
  }
  function sceneYOffset() {
    return projection.offset;
  }

  function updateSceneFrame() {
    const rect = interactionSurface.getBoundingClientRect();
    let minimumX = -0.34, maximumX = 0.34, minimumY = -0.24, maximumY = 0.28;
    if (["birth", "duck"].includes(phase)) {
      minimumX = -0.23; maximumX = 0.23;
      minimumY = -0.20; maximumY = 0.38;
    }
    if (["greeting", "letter"].includes(phase)) {
      const target = phase === "greeting" ? greetingTarget : nameTarget;
      minimumX = minimumY = Infinity;
      maximumX = maximumY = -Infinity;
      for (let index = 0; index < target.length; index += 3) {
        const depth = 9.4 - target[index + 2];
        const horizontal = target[index] / depth;
        const vertical = target[index + 1] / depth;
        minimumX = Math.min(minimumX, horizontal);
        maximumX = Math.max(maximumX, horizontal);
        minimumY = Math.min(minimumY, vertical);
        maximumY = Math.max(maximumY, vertical);
      }
    }
    const availableWidth = Math.max(24, rect.width - 30);
    const availableHeight = Math.max(24, rect.height - 18);
    const scale = Math.min(availableWidth * 2 / height / Math.max(0.05, maximumX - minimumX), availableHeight * 2 / height / Math.max(0.05, maximumY - minimumY), phase === "letter" ? 2.5 : 3.2);
    const centerY = rect.top + rect.height / 2;
    const container = element("experience").getBoundingClientRect();
    const clip = {
      left: Math.max(0, rect.left), right: Math.min(width, rect.right),
      top: Math.max(0, rect.top, container.top), bottom: Math.min(height, rect.bottom, container.bottom),
    };
    projection = { scale, offset: 1 - 2 * centerY / height - (minimumY + maximumY) * scale / 2, rect, clip };
  }
  const sceneObserver = new ResizeObserver(updateSceneFrame);
  sceneObserver.observe(interactionSurface);
  element("experience").addEventListener("scroll", () => requestAnimationFrame(updateSceneFrame), { passive: true });

  function projectScenePoint(horizontal, vertical, depth) {
    const rotatedX = Math.cos(rotation) * horizontal + Math.sin(rotation) * depth;
    const rotatedZ = -Math.sin(rotation) * horizontal + Math.cos(rotation) * depth;
    const tiltedY = Math.cos(tilt) * vertical + Math.sin(tilt) * rotatedZ;
    const tiltedZ = -Math.sin(tilt) * vertical + Math.cos(tilt) * rotatedZ;
    return {
      x: width / 2 + rotatedX * projection.scale / (9.4 - tiltedZ) * height / 2,
      y: height / 2 - (tiltedY * projection.scale / (9.4 - tiltedZ) + projection.offset) * height / 2,
    };
  }

  interactionSurface.addEventListener("pointerdown", (event) => {
    if (document.querySelector("dialog[open]")) return;
    updatePointer(event);
    const star = projectScenePoint(0, 0.2, 0);
    if (phase === "welcome" && Math.hypot(event.clientX - star.x, event.clientY - star.y) < 65) startGift();
    else if (started) startAudio();
    pointerDown = true;
    pointerMoved = 0;
    previousPointerX = downPointerX = event.clientX;
    previousPointerY = downPointerY = event.clientY;
    lastPointerAt = performance.now();
    interactionSurface.setPointerCapture(event.pointerId);
  });
  function updatePointer(event) {
    const normalizedX = event.clientX / width * 2 - 1;
    const normalizedY = 1 - event.clientY / height * 2;
    pointer.x = normalizedX * (width / height) * 9.4 / sceneScale();
    pointer.y = (normalizedY - sceneYOffset()) * 9.4 / sceneScale();
    pointer.screenX = event.clientX;
    pointer.screenY = event.clientY;
    pointer.kind = event.pointerType;
    pointer.present = true;
  }
  interactionSurface.addEventListener("pointerenter", updatePointer);
  interactionSurface.addEventListener("pointermove", (event) => {
    updatePointer(event);
    if (!pointerDown) return;
    const horizontal = event.clientX - previousPointerX;
    const vertical = event.clientY - previousPointerY;
    pointerMoved += Math.abs(horizontal) + Math.abs(vertical);
    rotationVelocity = horizontal * 0.0038;
    rotation += horizontal * 0.007;
    tilt = clamp(tilt + vertical * 0.0025, -0.5, 0.33);
    dragTotal += Math.abs(horizontal);
    previousPointerX = event.clientX;
    previousPointerY = event.clientY;
    lastPointerAt = performance.now();
  });
  function releasePointer(event) {
    if (!pointerDown) return;
    pointerDown = false;
    if (event.pointerType === "touch") pointer.present = false;
    if (phase === "cake" && dragTotal > 125) { dragTotal = 0; setPhase("greeting"); }
    else if (phase === "candle" && pointerMoved < 12) {
      if (candles.some((candle) => {
        const point = projectScenePoint(candle.x, 0.98 + candle.height * 0.65, candle.z);
        return Math.hypot(point.x - downPointerX, point.y - downPointerY) < 38;
      })) setPhase("wish");
    }
    if (interactionSurface.hasPointerCapture(event.pointerId)) interactionSurface.releasePointerCapture(event.pointerId);
  }
  interactionSurface.addEventListener("pointerup", releasePointer);
  interactionSurface.addEventListener("pointercancel", (event) => { pointerDown = false; pointer.present = false; if (interactionSurface.hasPointerCapture(event.pointerId)) interactionSurface.releasePointerCapture(event.pointerId); });
  interactionSurface.addEventListener("pointerleave", () => { if (!pointerDown) pointer.present = false; });

  let holdStart = 0;
  let holdProgress = 0;
  function beginHold() {
    if (phase !== "wish" || holdStart) return;
    holdStart = performance.now();
    element("hold").classList.add("holding");
    element("hold-label").textContent = "按住，把心愿送向星空…";
  }
  function cancelHold() {
    holdStart = 0;
    holdProgress = 0;
    element("hold").classList.remove("holding");
    element("hold-fill").style.transform = "scaleX(0)";
    element("hold-label").textContent = "或长按熄灭";
  }
  element("hold").addEventListener("pointerdown", (event) => {
    event.preventDefault();
    element("hold").setPointerCapture(event.pointerId);
    beginHold();
  });
  for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) element("hold").addEventListener(type, cancelHold);
  element("hold").addEventListener("contextmenu", (event) => event.preventDefault());
  element("hold").addEventListener("keydown", (event) => {
    if ([" ", "Enter"].includes(event.key)) { event.preventDefault(); beginHold(); }
  });
  element("hold").addEventListener("keyup", (event) => { if ([" ", "Enter"].includes(event.key)) cancelHold(); });
  element("hold").addEventListener("blur", cancelHold);

  let audioContext;
  let musicGain;
  let soundEnabled = true;
  let nextNoteAt = 0;
  let melodyStep = 0;
  const melody = [0, 7, 12, 16, 14, 7, 9, 12, 7, 4, 2, 7, 0, 4, 9, 7];
  function ensureAudio() {
    if (audioContext) return audioContext;
    const Constructor = window.AudioContext || window.webkitAudioContext;
    if (!Constructor) return null;
    try {
      audioContext = new Constructor();
      musicGain = audioContext.createGain();
      musicGain.gain.value = soundEnabled ? 0.30 : 0;
      musicGain.connect(audioContext.destination);
      nextNoteAt = audioContext.currentTime + 0.2;
    } catch { return null; }
    return audioContext;
  }
  function note(frequency, when, duration, volume = 0.18) {
    if (!audioContext || !musicGain) return;
    const oscillator = audioContext.createOscillator();
    const overtone = audioContext.createOscillator();
    const envelope = audioContext.createGain();
    oscillator.type = "sine";
    overtone.type = "sine";
    oscillator.frequency.value = frequency;
    overtone.frequency.value = frequency * 2.002;
    const harmonicGain = audioContext.createGain();
    harmonicGain.gain.value = 0.17;
    overtone.connect(harmonicGain);
    harmonicGain.connect(envelope);
    oscillator.connect(envelope);
    envelope.connect(musicGain);
    envelope.gain.setValueAtTime(0, when);
    envelope.gain.linearRampToValueAtTime(volume, when + 0.035);
    envelope.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    oscillator.start(when);
    overtone.start(when);
    oscillator.stop(when + duration + 0.05);
    overtone.stop(when + duration + 0.05);
    oscillator.onended = () => { oscillator.disconnect(); overtone.disconnect(); harmonicGain.disconnect(); envelope.disconnect(); };
  }
  function startAudio() {
    const context = ensureAudio();
    if (context && soundEnabled) context.resume().catch(() => {});
  }
  function chime(kind) {
    if (!soundEnabled || !started) return;
    const context = ensureAudio();
    if (!context) return;
    const notes = kind === 3 ? [523.25, 659.25, 783.99, 1046.5, 1318.5] : [392, 523.25, 659.25];
    notes.forEach((frequency, index) => note(frequency, context.currentTime + index * 0.13, 2.9, 0.19));
  }
  element("sound").addEventListener("click", () => {
    soundEnabled = !soundEnabled;
    element("sound").setAttribute("aria-pressed", String(soundEnabled));
    element("sound").setAttribute("aria-label", soundEnabled ? "关闭背景音乐" : "开启背景音乐");
    element("sound-on").hidden = !soundEnabled;
    element("sound-off").hidden = soundEnabled;
    if (soundEnabled) startAudio();
    if (audioContext && musicGain) musicGain.gain.setTargetAtTime(soundEnabled && !micStream && !micPending ? 0.30 : 0, audioContext.currentTime, 0.2);
    if (!audioContext && soundEnabled) showToast("当前浏览器未提供音频支持，星光仍会为你亮起。");
  });

  let micStream = null;
  let micSource = null;
  let analyser = null;
  let micTimeData = null;
  let micFrequencyData = null;
  let micPending = false;
  let breathDetector = null;
  let micLastUIAt = 0;
  let micLastSampleAt = 0;
  let blowAmount = 0;
  let micRequest = 0;
  function stopMicrophone() {
    micRequest++;
    if (micStream) micStream.getTracks().forEach((track) => track.stop());
    if (micSource) micSource.disconnect();
    if (analyser) analyser.disconnect();
    micStream = null;
    micSource = null;
    analyser = null;
    micPending = false;
    breathDetector = null;
    blowAmount = 0;
    element("mic-panel").hidden = true;
    element("mic-calibrate").disabled = true;
    if (musicGain && audioContext) musicGain.gain.setTargetAtTime(started && soundEnabled ? 0.30 : 0, audioContext.currentTime, 0.35);
    element("microphone").textContent = "吹灭蜡烛";
    element("microphone").disabled = false;
    element("microphone").setAttribute("aria-pressed", "false");
    element("microphone").setAttribute("aria-busy", "false");
  }
  element("mic-close").addEventListener("click", () => { stopMicrophone(); element("mic-status").textContent = "麦克风已关闭，也可以长按或轻点吹灭。"; });
  element("manual-blow").addEventListener("click", () => { if (phase === "wish") setPhase("finale"); });
  function resetMicrophone() {
    if (!breathDetector) return;
    breathDetector.mode = element("mic-sensitivity").value;
    breathDetector.reset();
    blowAmount = 0;
    element("mic-state").textContent = "安静半秒，校准环境声音…";
    element("mic-status").textContent = "先别吹气，校准后轻吹约半秒就好。";
    micLastUIAt = 0;
    micLastSampleAt = performance.now();
  }
  element("mic-calibrate").addEventListener("click", resetMicrophone);
  element("mic-sensitivity").addEventListener("change", resetMicrophone);
  element("microphone").addEventListener("click", async () => {
    if (micStream) { element("mic-status").textContent = "正在听你轻轻的呼气；想关闭麦克风，可点击面板右上角 ×。"; return; }
    element("mic-status").hidden = false;
    if (!navigator.mediaDevices?.getUserMedia || !window.isSecureContext) {
      element("mic-status").textContent = "当前环境无法启用麦克风，请长按按钮；公网访问时需要 HTTPS。";
      return;
    }
    const context = ensureAudio();
    if (!context) { element("mic-status").textContent = "当前浏览器不支持声音分析，请使用长按按钮。"; return; }
    const request = ++micRequest;
    micPending = true;
    if (musicGain) musicGain.gain.setTargetAtTime(0, context.currentTime, 0.08);
    element("mic-panel").hidden = false;
    element("mic-state").textContent = "请允许使用麦克风";
    element("mic-level").style.transform = "scaleX(0)";
    element("blow-level").style.transform = "scaleX(0)";
    element("blow-percent").textContent = "0%";
    element("microphone").disabled = true;
    element("microphone").textContent = "等待麦克风授权…";
    element("microphone").setAttribute("aria-busy", "true");
    element("mic-status").textContent = "请在浏览器提示中选择是否允许。声音只在本机分析，不会录音或上传。";
    try {
      await context.resume();
      if (request !== micRequest || phase !== "wish") return;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }, video: false });
      if (request !== micRequest || phase !== "wish" || document.hidden) { stream.getTracks().forEach((track) => track.stop()); return; }
      micStream = stream;
      micPending = false;
      micSource = context.createMediaStreamSource(stream);
      analyser = context.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.15;
      micSource.connect(analyser);
      micTimeData = new Float32Array(analyser.fftSize);
      micFrequencyData = new Float32Array(analyser.frequencyBinCount);
      breathDetector = new window.BirthdayBreathDetector(element("mic-sensitivity").value);
      element("mic-calibrate").disabled = false;
      resetMicrophone();
      element("microphone").textContent = "靠近麦克风，轻轻吹气";
      element("microphone").setAttribute("aria-pressed", "true");
      element("microphone").setAttribute("aria-busy", "false");
      stream.getAudioTracks().forEach((track) => track.addEventListener("ended", () => {
        if (micStream !== stream) return;
        stopMicrophone();
        element("mic-status").textContent = "麦克风连接已结束，可以重新开启，或长按、轻点吹灭。";
      }, { once: true }));
    } catch (error) {
      if (request !== micRequest) return;
      stopMicrophone();
      element("mic-status").textContent = error.name === "NotAllowedError"
        ? "没有开启麦克风也没关系，长按下方按钮，同样可以送出心愿。"
        : error.name === "NotFoundError" ? "没有找到麦克风，长按下方按钮即可许愿。" : "麦克风暂时不可用，长按下方按钮即可许愿。";
    } finally {
      if (request === micRequest || !micStream) element("microphone").disabled = false;
    }
  });

  function updateMicrophone(now) {
    if (!analyser || !breathDetector || phase !== "wish") return;
    const delta = Math.min(0.1, (now - micLastSampleAt) / 1000);
    micLastSampleAt = now;
    analyser.getFloatTimeDomainData(micTimeData);
    analyser.getFloatFrequencyData(micFrequencyData);
    let energy = 0, totalPower = 0, lowPower = 0, peakPower = 0, logPower = 0, bins = 0;
    for (const value of micTimeData) energy += value * value;
    const binWidth = audioContext.sampleRate / analyser.fftSize;
    const lastBin = Math.min(micFrequencyData.length - 1, Math.floor(5000 / binWidth));
    for (let index = 1; index <= lastBin; index++) {
      const power = Math.max(1e-14, Math.pow(10, micFrequencyData[index] / 10));
      totalPower += power;
      if (index * binWidth < 550) lowPower += power;
      peakPower = Math.max(peakPower, power);
      logPower += Math.log(power);
      bins++;
    }
    const result = breathDetector.update({
      rms: Math.sqrt(energy / micTimeData.length),
      flatness: Math.exp(logPower / Math.max(1, bins)) / Math.max(1e-14, totalPower / Math.max(1, bins)),
      lowShare: lowPower / Math.max(totalPower, 1e-14),
      peakShare: peakPower / Math.max(totalPower, 1e-14),
    }, delta);
    blowAmount = result.progress;
    if (!holdStart) {
      element("hold-fill").style.transform = `scaleX(${blowAmount})`;
    }
    if (now - micLastUIAt > 90) {
      micLastUIAt = now;
      const percent = Math.round(blowAmount * 100);
      element("mic-meter").setAttribute("aria-valuenow", String(Math.round(result.level * 100)));
      element("mic-level").style.transform = `scaleX(${result.level})`;
      element("mic-level-label").textContent = result.calibrating ? "校准中" : result.level > 0.08 ? "收到声音" : "等待轻吹";
      element("blow-meter").setAttribute("aria-valuenow", String(percent));
      element("blow-level").style.transform = `scaleX(${blowAmount})`;
      element("blow-percent").textContent = `${percent}%`;
      element("mic-state").textContent = result.calibrating ? "安静半秒，校准环境声音…" : result.audible ? "听见了，心愿正在起飞…" : "已就绪，靠近麦克风轻吹";
      element("mic-status").textContent = result.calibrating ? "先别吹气，校准后轻吹约半秒就好。" : result.silent
        ? "暂时没检测到声音。请检查麦克风，或直接长按、轻点吹灭。"
        : "靠近正在使用的麦克风，轻吹约半秒。背景音乐已暂时静音。";
    }
    if (result.complete) setPhase("finale");
  }

  element("keepsake").addEventListener("click", () => {
    try {
      const image = document.createElement("canvas");
      image.width = 1200;
      image.height = 1500;
      const context = image.getContext("2d");
      const background = context.createRadialGradient(600, 720, 50, 600, 720, 950);
      background.addColorStop(0, "#322034");
      background.addColorStop(1, "#070a15");
      context.fillStyle = background;
      context.fillRect(0, 0, 1200, 1500);
      const fit = Math.max(1200 / canvas.width, 1300 / canvas.height);
      context.drawImage(canvas, (1200 - canvas.width * fit) / 2, (1500 - canvas.height * fit) / 2, canvas.width * fit, canvas.height * fit);
      context.textAlign = "center";
      context.fillStyle = "#dfbca0";
      context.font = '16px sans-serif';
      context.fillText("A LITTLE SURPRISE, JUST FOR YOU", 600, 190);
      context.fillStyle = "#f4e3d4";
      context.font = '46px "Songti SC", serif';
      context.fillText("愿你每一次闪耀，都被温柔看见。", 600, 300);
      context.font = '25px "Songti SC", serif';
      const lines = [];
      for (const paragraph of gift.message.split("\n")) {
        let line = "";
        for (const character of paragraph) {
          if (context.measureText(line + character).width > 880) { lines.push(line); line = character; }
          else line += character;
        }
        lines.push(line);
      }
      const startY = 1100 - Math.max(0, lines.length - 4) * 12;
      const lineHeight = Math.min(48, 260 / Math.max(1, lines.length));
      lines.forEach((line, index) => context.fillText(line, 600, startY + index * lineHeight));
      context.font = "20px sans-serif";
      context.fillStyle = "#b9a399";
      context.fillText(`— ${gift.from}`, 600, 1410);
      image.toBlob((blob) => {
        if (!blob) { showToast("暂时没能生成纪念图，请稍后再试。"); return; }
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.download = "hi3d-神秘生日礼物.png";
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
        showToast("愿这一刻的星光，一直陪着你。");
      }, "image/png");
    } catch { showToast("当前浏览器未能导出图片，你也可以用截图收藏这一刻。"); }
  });

  function drawCloud(cloud, rotate, pitch, opacity, scale, yOffset, time, dynamic = false, atmosphere = 1, illumination = 0, glow = false, appearance = {}) {
    const fields = [["positions", "Position", 3], ["colors", "Color", 3], ["sizes", "Size", 1], ["seeds", "Seed", 1]];
    for (const [key, attribute, components] of fields) {
      gl.bindBuffer(gl.ARRAY_BUFFER, cloud.buffers[key]);
      if (dynamic && key === "positions") gl.bufferSubData(gl.ARRAY_BUFFER, 0, cloud.positions);
      gl.vertexAttribPointer(attributes[attribute], components, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(attributes[attribute]);
    }
    gl.uniform1f(uniforms.Rotation, rotate);
    gl.uniform1f(uniforms.Tilt, pitch);
    gl.uniform1f(uniforms.Opacity, opacity);
    gl.uniform1f(uniforms.Scale, scale);
    gl.uniform1f(uniforms.YOffset, yOffset);
    gl.uniform1f(uniforms.Time, time);
    gl.uniform1f(uniforms.Atmosphere, atmosphere);
    gl.uniform1f(uniforms.Warm, atmosphere < 0.5 ? 0 : warmed);
    gl.uniform1f(uniforms.CandleLight, illumination);
    gl.uniform1f(uniforms.Glow, glow ? 1 : 0);
    gl.uniform1f(uniforms.Material, appearance.material ? 1 : 0);
    gl.uniform1f(uniforms.Heart, appearance.heart || 0);
    gl.uniform1f(uniforms.Duck, appearance.duck || 0);
    gl.uniform1f(uniforms.Reveal, appearance.reveal ?? 1);
    gl.uniform1f(uniforms.Hover, appearance.hover || 0);
    gl.uniform2f(uniforms.Pointer, pointer.x, pointer.y);
    if (appearance.material) {
      gl.enable(gl.DEPTH_TEST);
      gl.depthMask(true);
      gl.depthFunc(gl.LEQUAL);
      if (!appearance.preserveDepth) gl.clear(gl.DEPTH_BUFFER_BIT);
    }
    if (appearance.material || glow) gl.blendFuncSeparate(gl.SRC_ALPHA, appearance.material ? gl.ONE_MINUS_SRC_ALPHA : gl.ONE, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.drawArrays(gl.POINTS, 0, cloud.total);
    if (appearance.material) gl.disable(gl.DEPTH_TEST);
    if (appearance.material || glow) gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
  }

  function drawDuckHat(age, time, scale, yOffset) {
    const onDuck = phase === "duck";
    if (!onDuck && !(phase === "heart" && magicFromDuck && age < 2.65)) return;
    const progress = onDuck ? reduced ? 1 : clamp((age - 0.60) / 1.5, 0, 1) : 1;
    const drop = onDuck && !reduced ? (1 - smooth(progress)) * 1.05 - Math.sin(progress * Math.PI * 2) * 0.055 : 0;
    const bob = reduced ? 0 : Math.sin(time * 1.7) * 0.035;
    const morph = onDuck ? 0 : smooth(age / (reduced ? 0.6 : 2.6));
    const opacity = onDuck ? reduced ? 0.93 : smooth((age - 0.60) / 0.30) * 0.93 : (1 - smooth((morph - 0.35) / 0.65)) * 0.93;
    for (let index = 0; index < cakeHat.total; index++) {
      const offset = index * 3, to = index % count * 3;
      for (let axis = 0; axis < 3; axis++) {
        cakeHat.positions[offset + axis] = hatTarget[offset + axis] * (1 - morph) + heartTarget[to + axis] * morph;
      }
      cakeHat.positions[offset + 1] += (drop + bob) * (1 - morph);
      if (!onDuck && !reduced) {
        const spread = Math.sin(morph * Math.PI) * 0.18;
        cakeHat.positions[offset] += scatter[to] * spread;
        cakeHat.positions[offset + 2] += scatter[to + 2] * spread;
      }
    }
    if (onDuck && progress >= 1 && !duckHatReady) {
      duckHatReady = true;
      document.body.dataset.hat = "ready";
      element("primary").disabled = false;
      element("primary-label").textContent = narratives.duck[3];
      element("subtitle").textContent = narratives.duck[2];
      chime(1);
    }
    if (opacity > 0.001) drawCloud(cakeHat, rotation, tilt, opacity, scale, yOffset, time, true, 0, 0, false, {
      material: true, preserveDepth: true, duck: onDuck ? 0.40 : 0, heart: morph, hover: onDuck ? pointer.power * 0.4 : 0,
    });
  }

  function updateCake(now, time, delta) {
    const elapsed = (now - phaseStart) / 1000;
    const frame = Math.min(delta * 60, 2.1);
    const textMode = ["greeting", "finale", "letter"].includes(phase);
    const magicMode = ["heart", "returning"].includes(phase);
    const spring = reduced ? 0.075 : magicMode ? 0.022 : textMode ? 0.010 : 0.014;
    const damping = Math.pow(reduced ? 0.72 : 0.87, frame);
    let opacity = 0.84;
    if (phase === "welcome") return 0;
    if (phase === "birth") {
      if (elapsed > 6.8) { setPhase("duck"); chime(0); }
    }
    if (phase === "returning" && elapsed > (reduced ? 0.85 : 2.6)) setPhase(magicReturnPhase);
    if (phase === "heart" && elapsed > (reduced ? 0.8 : 3.1) && document.body.dataset.magic !== "beating") {
      document.body.dataset.magic = "beating";
      element("resonance-label").textContent = reduced ? "同一片星光，同一份心意" : "同频共振 · 每一次心跳，都有回响";
    }
    if (phase === "finale" && elapsed > (reduced ? 1.1 : 6.5)) setPhase("letter");
    const cosine = Math.cos(rotation), sine = Math.sin(rotation);
    const tiltCosine = Math.cos(tilt), tiltSine = Math.sin(tilt);
    for (let index = 0; index < count; index++) {
      const offset = index * 3;
      const seed = cake.seeds[index];
      let targetX = activeTarget[offset];
      let targetY = activeTarget[offset + 1];
      let targetZ = activeTarget[offset + 2];
      if (phase === "birth") {
        const age = Math.max(0, elapsed - seed * 2.4);
        const expansion = smooth(age / 0.85);
        const attract = smooth((age - 0.65) / 2.6);
        const swirl = age * 1.25;
        const radiusX = scatter[offset] * expansion * 0.54;
        const radiusZ = scatter[offset + 2] * expansion * 0.54;
        targetX = (Math.cos(swirl) * radiusX - Math.sin(swirl) * radiusZ) * (1 - attract) + duckTarget[offset] * attract;
        targetY = (0.2 + scatter[offset + 1] * expansion * 0.45) * (1 - attract) + duckTarget[offset + 1] * attract;
        targetZ = (Math.sin(swirl) * radiusX + Math.cos(swirl) * radiusZ) * (1 - attract) + duckTarget[offset + 2] * attract;
      } else if (["heart", "returning"].includes(phase)) {
        const returning = phase === "returning";
        const duration = reduced ? 0.65 : returning ? 2.0 : 2.65;
        const progress = clamp(elapsed / duration, 0, 1);
        const assemble = smooth(returning ? progress : (progress - 0.16) / 0.84);
        const from = returning ? heartTarget : magicFromDuck ? duckTarget : cakeTarget;
        const to = returning ? cakeTarget : heartTarget;
        const spread = reduced ? 0 : Math.sin(progress * Math.PI) * (returning ? 0.16 : 0.31);
        const swirl = elapsed * 1.6;
        targetX = from[offset] * (1 - assemble) + to[offset] * assemble + (scatter[offset] * Math.cos(swirl) - scatter[offset + 2] * Math.sin(swirl)) * spread;
        targetY = from[offset + 1] * (1 - assemble) + to[offset + 1] * assemble + scatter[offset + 1] * spread * 0.68;
        targetZ = from[offset + 2] * (1 - assemble) + to[offset + 2] * assemble + (scatter[offset] * Math.sin(swirl) + scatter[offset + 2] * Math.cos(swirl)) * spread;
      } else if (phase === "finale" && elapsed < 4.4 && !reduced) {
        const burst = Math.floor(seed * 5);
        const age = Math.max(0, elapsed - burst * 0.4);
        const radius = Math.max(0, 1 - Math.exp(-age * 2.1));
        targetX = fireworkCenter[offset] + fireworkVelocity[offset] * radius;
        targetY = fireworkCenter[offset + 1] + fireworkVelocity[offset + 1] * radius - 0.15 * age * age;
        targetZ = fireworkCenter[offset + 2] + fireworkVelocity[offset + 2] * radius;
      }
      if (!reduced) {
        targetY += Math.sin(time * 0.85 + seed * 35) * 0.014;
        targetX += Math.cos(time * 0.7 + seed * 35) * 0.008;
        if (phase === "duck") targetY += Math.sin(time * 1.7) * 0.035;
      }
      const rotatedX = cosine * cake.positions[offset] + sine * cake.positions[offset + 2];
      const rotatedZ = -sine * cake.positions[offset] + cosine * cake.positions[offset + 2];
      const tiltedY = tiltCosine * cake.positions[offset + 1] + tiltSine * rotatedZ;
      const tiltedZ = -tiltSine * cake.positions[offset + 1] + tiltCosine * rotatedZ;
      const perspective = 9.4 / (9.4 - tiltedZ);
      const differenceX = rotatedX * perspective - pointer.x;
      const differenceY = tiltedY * perspective - pointer.y;
      const distanceSquared = differenceX * differenceX + differenceY * differenceY;
      if (pointer.power > 0.005 && distanceSquared < 1.65 && !["birth", "returning", "finale", "letter"].includes(phase)) {
        const envelope = Math.pow(1 - distanceSquared / 1.65, 2) * pointer.power;
        const ripple = reduced ? 0 : Math.sin(Math.sqrt(distanceSquared) * 9 - time * 5.8 + seed * 2) * 0.10;
        const horizontal = envelope * (differenceX * 0.48 - differenceY * 0.40 + ripple);
        const vertical = envelope * (differenceY * 0.48 + differenceX * 0.40 + ripple * 0.5);
        targetX += cosine * horizontal + sine * tiltSine * vertical;
        targetY += tiltCosine * vertical;
        targetZ += sine * horizontal - cosine * tiltSine * vertical + Math.sin(seed * 19 + time * 2.3) * envelope * (reduced ? 0 : 0.13);
      }
      velocities[offset] = (velocities[offset] + (targetX - cake.positions[offset]) * spring * frame) * damping;
      velocities[offset + 1] = (velocities[offset + 1] + (targetY - cake.positions[offset + 1]) * spring * frame) * damping;
      velocities[offset + 2] = (velocities[offset + 2] + (targetZ - cake.positions[offset + 2]) * spring * frame) * damping;
      cake.positions[offset] += velocities[offset] * frame;
      cake.positions[offset + 1] += velocities[offset + 1] * frame;
      cake.positions[offset + 2] += velocities[offset + 2] * frame;
    }
    return opacity;
  }

  function animate(now) {
    if (!running) return;
    requestAnimationFrame(animate);
    if (document.hidden) { lastFrame = now; return; }
    const delta = Math.min((now - lastFrame) / 1000, 0.04);
    if (delta < (reduced ? 1 / 31 : 1 / 65)) return;
    lastFrame = now;
    const time = now / 1000;
    frameCount++;
    if (audioContext && soundEnabled && started && audioContext.state === "running" && audioContext.currentTime >= nextNoteAt) {
      note(261.63 * Math.pow(2, melody[melodyStep % melody.length] / 12), audioContext.currentTime + 0.03, 3.6, 0.13);
      if (melodyStep % 4 === 0) note(130.81 * Math.pow(2, [0, 5, 9, 7][Math.floor(melodyStep / 4) % 4] / 12), audioContext.currentTime + 0.05, 5.6, 0.15);
      nextNoteAt = audioContext.currentTime + (phase === "wish" ? 0.85 : 1.25);
      melodyStep++;
    }
    if (holdStart && phase === "wish") {
      holdProgress = clamp((now - holdStart) / 1900, 0, 1);
      element("hold-fill").style.transform = `scaleX(${holdProgress})`;
      if (holdProgress >= 1) setPhase("finale");
    }
    updateMicrophone(now);
    const targetWarmth = ["wish", "finale", "letter"].includes(phase) ? 1 : 0;
    warmed += (targetWarmth - warmed) * Math.min(1, delta * 2.4);
    candleLight += ((phase === "wish" ? 1 : 0) - candleLight) * Math.min(1, delta * 3.4);
    const breath = Math.max(holdProgress, blowAmount);
    const lightStrength = candleLight * (1 - breath * 0.7) * (reduced ? 1 : 0.97 + Math.sin(time * 7.1) * 0.018 + Math.sin(time * 11.3) * 0.012);
    gl.uniform1f(uniforms.Still, reduced ? 1 : 0);
    const hoverTarget = pointer.present ? reduced ? 0.15 : pointerDown ? 1 : 0.85 : 0;
    pointer.power += (hoverTarget - pointer.power) * Math.min(1, delta * 7.5);
    if (phase === "welcome") {
      const star = projectScenePoint(0, 0.2, 0);
      const near = pointer.present && pointer.kind !== "touch" && Math.hypot(pointer.screenX - star.x, pointer.screenY - star.y) < 58 && !document.querySelector("dialog[open]");
      introHover = clamp(introHover + delta * (near ? 1.25 : -1.4), 0, 1);
      if (introHover > 0.85) startGift(false);
    }
    const magicAge = (now - phaseStart) / 1000;
    const heartTime = Math.max(0, magicAge - (reduced ? 0.8 : 3.1));
    const beat = (heartTime % 1.15) / 1.15;
    heartPulse = phase === "heart" && magicAge > 3.1 && !reduced ? 0.085 * Math.exp(-Math.pow((beat - 0.13) / 0.075, 2)) + 0.046 * Math.exp(-Math.pow((beat - 0.31) / 0.10, 2)) : 0;
    const textMode = ["greeting", "finale", "letter", "heart", "returning"].includes(phase);
    if (!pointerDown) {
      if (textMode) {
        rotation *= 1 - Math.min(1, delta * 3.2);
        tilt *= 1 - Math.min(1, delta * 3.2);
      } else {
        if (now - lastPointerAt < 800) rotation += rotationVelocity;
        else if (["birth", "duck"].includes(phase)) {
          rotation += ((reduced ? 0.18 : 0.18 + Math.sin(time * 0.55) * 0.12) - rotation) * Math.min(1, delta * 0.7);
        } else if (!reduced) rotation += delta * 0.045;
        rotationVelocity *= Math.pow(0.92, delta * 60);
        tilt += ((["birth", "duck"].includes(phase) ? -0.04 : -0.18) - tilt) * delta * 0.25;
      }
    }
    const opacity = updateCake(now, time, delta);
    gl.clear(gl.COLOR_BUFFER_BIT);
    drawCloud(stars, reduced ? 0 : Math.sin(time * 0.014) * 0.03, 0, 0.62, 2.8, 0, time, false, 0.25);
    const cakeScale = sceneScale();
    const offset = sceneYOffset();
    const clip = projection.clip;
    gl.enable(gl.SCISSOR_TEST);
    gl.scissor(Math.round(clip.left * pixelRatio), Math.max(0, Math.round((height - clip.bottom) * pixelRatio)), Math.max(0, Math.round((clip.right - clip.left) * pixelRatio)), Math.max(0, Math.round((clip.bottom - clip.top) * pixelRatio)));
    if (["cake", "candle", "wish"].includes(phase)) drawCloud(orbit, rotation * 0.35 + (reduced ? 0 : time * 0.018), -0.26, 0.32, cakeScale, offset, time);
    if (phase === "welcome" || (phase === "birth" && magicAge < 1.6)) {
      const starOpacity = phase === "welcome" ? 1 : 1 - smooth(magicAge / 1.6);
      drawCloud(firstHalo, rotation, tilt, starOpacity * (0.45 + introHover * 0.2), cakeScale * (1 + introHover * 0.4), offset, time, false, 0, 0, true);
      drawCloud(giftSeal, rotation, tilt, starOpacity * 0.9, cakeScale, offset, time, false, 0, 0, false, { hover: pointer.power });
    }
    if (candleLight > 0.002) drawCloud(candleHalos, rotation, tilt, lightStrength * 0.50, cakeScale, offset, time, false, 0, 0, true);
    const colored = ["birth", "duck", "cake", "candle", "wish", "heart", "returning"].includes(phase);
    const heartTint = phase === "heart" ? smooth(magicAge / (reduced ? 0.6 : 2.6)) : phase === "returning" ? 1 - smooth(magicAge / (reduced ? 0.65 : 2.0)) : 0;
    if (phase === "heart" && magicAge > 3.1 && !reduced) {
      for (let index = 0; index < 2; index++) {
        const wave = ((heartTime + index * 0.33) % 1.15) / 1.15;
        drawCloud(resonance, rotation * 0.2, tilt * 0.2, 0.18 * Math.pow(1 - wave, 2), cakeScale * (1 + wave * 0.18), offset, time, false, 0);
      }
    }
    if (phase !== "welcome") drawCloud(cake, rotation, tilt, opacity * (colored ? 0.95 : 0.82), cakeScale * (1 + heartPulse), offset, time, true, colored || phase === "finale" ? 0 : 1, lightStrength, false, {
      material: colored, heart: heartTint, reveal: phase === "birth" ? smooth(magicAge / 3.5) : 1,
      duck: ["birth", "duck"].includes(phase) ? 1 : phase === "heart" && magicFromDuck ? 1 - heartTint : 0,
      hover: ["duck", "cake", "candle", "wish", "heart"].includes(phase) ? pointer.power : 0,
    });
    drawDuckHat((now - phaseStart) / 1000, time, cakeScale * (1 + heartPulse), offset);
    if (phase === "wish") {
      const breath = Math.max(holdProgress, blowAmount);
      for (let index = 0; index < flameCount; index++) {
        const candle = candles[index % candles.length];
        const seed = flames.seeds[index];
        const vertical = reduced ? seed : (seed + time * (0.7 + seed * 0.35)) % 1;
        const angle = seed * 73 + (reduced ? 0 : time * 4);
        const radius = Math.sin(vertical * Math.PI) * 0.075 * (1 - breath * 0.65);
        const flicker = reduced ? 0 : Math.sin(time * 9 + seed * 20) * 0.012;
        flames.positions[index * 3] = candle.x + Math.cos(angle) * radius + vertical * flicker + breath * vertical * 0.32;
        flames.positions[index * 3 + 1] = 0.98 + candle.height + vertical * (0.34 - breath * 0.19);
        flames.positions[index * 3 + 2] = candle.z + Math.sin(angle) * radius;
      }
      drawCloud(flames, rotation, tilt, 0.62 * (1 - breath * 0.65), cakeScale, offset, time, true, 0);
    }
    gl.disable(gl.SCISSOR_TEST);
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      cancelHold();
      if (micStream) {
        stopMicrophone();
        element("mic-status").textContent = "切换页面时已关闭麦克风，可以再次开启或长按许愿。";
      }
      if (audioContext?.state === "running") audioContext.suspend().catch(() => {});
    } else {
      if (phase === "birth") setPhase("duck");
      else if (phase === "returning") setPhase(magicReturnPhase);
      else if (phase === "finale") setPhase("letter");
      if (started && soundEnabled) audioContext?.resume().catch(() => {});
      lastFrame = performance.now();
    }
  });
  addEventListener("pagehide", () => stopMicrophone());
  setNarrative("welcome", true);
  requestAnimationFrame(animate);
})();
