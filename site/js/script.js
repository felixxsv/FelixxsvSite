const bgImages = [
  "img/bg/VRChat_2024-12-22_20-41-00.313_1920x1080.png",
  "img/bg/VRChat_2025-07-03_22-41-17.728_1920x1080.png",
  "img/bg/VRChat_2025-07-09_23-19-15.486_1920x1080.png",
  "img/bg/VRChat_2025-06-28_22-17-19.163_1920x1080.png",
  "img/bg/VRChat_2025-06-16_21-21-12.591_1920x1080.png",
  "img/bg/VRChat_2025-06-02_20-59-04.228_1920x1080.png",
  "img/bg/VRChat_2025-05-29_22-52-10.961_1920x1080.png",
  "img/bg/VRChat_2025-05-25_00-51-51.329_1920x1080.png",
  "img/bg/VRChat_2025-05-24_21-45-24.260_1080x1920.png",
  "img/bg/VRChat_2025-05-05_23-33-27.167_1920x1080.png",
  "img/bg/VRChat_2025-04-27_17-04-30.188_1920x1080.png"
];

const VIDEO_SRC = "video/skull-edit1.2.mp4";
const VIDEO_INTERVAL_MINUTES = 1;
const VIDEO_LOOPS = 3;
const VIDEO_VOLUME = 0.2;

const TRANSPARENT_PIXEL = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
const CROSSFADE_MS = 400;
const INITIAL_BG_MAX_WAIT_MS = 8000;

let bgImageA = null;
let bgImageB = null;
let activeImg = null;
let idleImg = null;

let bgVideoEl = null;

let audioUnlocked = false;
let videoCycleStarted = false;

const imageCache = new Map();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const pseudoRandom = (seed) => {
  const x = Math.sin(seed * 9973) * 10000;
  return x - Math.floor(x);
};

const quarterSlot = (d) => d.getHours() * 4 + Math.floor(d.getMinutes() / 15);

const imageBySlot = (slot) => {
  const idx = Math.floor(pseudoRandom(slot) * bgImages.length);
  return bgImages[idx];
};

const preloadImage = (src) => {
  if (imageCache.has(src)) return imageCache.get(src);

  const p = new Promise((resolve) => {
    const img = new Image();
    img.src = src;
    const done = () => resolve(src);

    if (img.decode) {
      img.decode().then(done).catch(done);
    } else {
      img.onload = done;
      img.onerror = done;
    }
  });

  imageCache.set(src, p);
  return p;
};

const preloadAllImages = async () => {
  for (const src of bgImages) {
    await preloadImage(src);
    await sleep(0);
  }
};

const now0 = new Date();
const initialSlot = quarterSlot(now0);
const initialSrc = imageBySlot(initialSlot);
const initialNextSrc = imageBySlot(initialSlot + 1);
const initialReady = preloadImage(initialSrc);
preloadImage(initialNextSrc);

const setupBackgroundLayers = () => {
  const base = document.getElementById("background-image");
  if (!base) return;

  if (!base.getAttribute("src")) base.setAttribute("src", TRANSPARENT_PIXEL);

  const parent = base.parentElement;

  base.style.position = "absolute";
  base.style.inset = "0";
  base.style.opacity = "0";
  base.style.transition = `opacity ${CROSSFADE_MS}ms ease`;
  base.style.pointerEvents = "none";

  const clone = base.cloneNode(false);
  clone.removeAttribute("id");
  clone.setAttribute("aria-hidden", "true");
  clone.style.position = "absolute";
  clone.style.inset = "0";
  clone.style.opacity = "0";
  clone.style.transition = `opacity ${CROSSFADE_MS}ms ease`;
  clone.style.pointerEvents = "none";
  clone.setAttribute("src", TRANSPARENT_PIXEL);

  if (parent) parent.appendChild(clone);

  bgImageA = base;
  bgImageB = clone;
  activeImg = bgImageA;
  idleImg = bgImageB;
};

const showInitialBackground = async () => {
  if (!activeImg) return;

  await initialReady;

  activeImg.src = initialSrc;
  activeImg.style.opacity = "1";
  idleImg.style.opacity = "0";

  preloadImage(initialNextSrc);
};

const crossfadeTo = async (src) => {
  if (!activeImg || !idleImg) return;
  if (activeImg.src && activeImg.src.endsWith(src)) return;

  await preloadImage(src);

  idleImg.src = src;
  idleImg.style.opacity = "0";

  await sleep(0);

  idleImg.style.opacity = "1";
  activeImg.style.opacity = "0";

  await sleep(CROSSFADE_MS + 20);

  const tmp = activeImg;
  activeImg = idleImg;
  idleImg = tmp;
  idleImg.style.opacity = "0";
};

const updateBackground = async () => {
  const now = new Date();
  const slot = quarterSlot(now);
  const current = imageBySlot(slot);
  const next = imageBySlot(slot + 1);

  preloadImage(next);
  await crossfadeTo(current);
};

const scheduleBackgroundUpdates = () => {
  const now = new Date();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();
  const milliseconds = now.getMilliseconds();

  const minutesToNext = 15 - (minutes % 15);
  const msToNextSlot = (minutesToNext * 60 - seconds) * 1000 - milliseconds;

  setTimeout(() => {
    updateBackground();
    setInterval(updateBackground, 15 * 60 * 1000);
  }, msToNextSlot);
};

const ensureMetadata = (video) =>
  new Promise((resolve) => {
    if (video.readyState >= 1 && Number.isFinite(video.duration) && video.duration > 0) return resolve();
    video.addEventListener("loadedmetadata", () => resolve(), { once: true });
  });

const playPromise = (video) => {
  const p = video.play();
  if (p && p.catch) return p;
  return Promise.resolve();
};

const attemptUnlockAudio = async () => {
  if (audioUnlocked) return;
  if (!bgVideoEl) return;

  if (!bgVideoEl.paused) {
    bgVideoEl.muted = false;
    bgVideoEl.volume = VIDEO_VOLUME;
    audioUnlocked = true;
    return;
  }

  bgVideoEl.muted = false;
  bgVideoEl.volume = VIDEO_VOLUME;

  try {
    await playPromise(bgVideoEl);
    bgVideoEl.pause();
    try {
      bgVideoEl.currentTime = 0;
    } catch {}
    audioUnlocked = true;
  } catch {
    bgVideoEl.muted = true;
  }
};

const playOnceFull = (video) =>
  new Promise((resolve) => {
    const onEnded = () => resolve(true);
    video.addEventListener("ended", onEnded, { once: true });

    try {
      video.currentTime = 0;
    } catch {}

    const p = video.play();
    if (p && p.catch) {
      p.catch(() => resolve(false));
    }
  });

const playVideoLoopsThenHide = async (loops) => {
  if (!bgVideoEl) return;

  await ensureMetadata(bgVideoEl);

  if (activeImg) activeImg.style.display = "none";
  if (idleImg) idleImg.style.display = "none";

  bgVideoEl.style.display = "block";

  for (let i = 0; i < loops; i++) {
    bgVideoEl.volume = VIDEO_VOLUME;

    if (audioUnlocked) {
      bgVideoEl.muted = false;
      const ok = await playOnceFull(bgVideoEl);
      if (!ok) {
        bgVideoEl.muted = true;
        await playOnceFull(bgVideoEl);
      }
    } else {
      bgVideoEl.muted = true;
      await playOnceFull(bgVideoEl);
    }
  }

  bgVideoEl.pause();
  bgVideoEl.style.display = "none";

  if (activeImg) activeImg.style.display = "block";
  if (idleImg) idleImg.style.display = "block";
};

const startVideoCycle = async () => {
  if (videoCycleStarted) return;
  videoCycleStarted = true;

  if (!bgVideoEl) return;

  bgVideoEl.src = VIDEO_SRC;
  bgVideoEl.preload = "auto";
  bgVideoEl.playsInline = true;
  bgVideoEl.loop = false;
  bgVideoEl.volume = VIDEO_VOLUME;
  bgVideoEl.muted = true;
  bgVideoEl.style.display = "none";
  bgVideoEl.style.pointerEvents = "none";
  bgVideoEl.load();

  await ensureMetadata(bgVideoEl);

  const intervalMs = VIDEO_INTERVAL_MINUTES * 60 * 1000;
  const loops = Math.max(1, parseInt(VIDEO_LOOPS, 10) || 1);

  while (true) {
    await sleep(intervalMs);
    await playVideoLoopsThenHide(loops);
    await sleep(0);
  }
};

document.addEventListener("contextmenu", (e) => {
  if (e.target && e.target.tagName === "IMG") e.preventDefault();
});

document.addEventListener("DOMContentLoaded", async () => {
  setupBackgroundLayers();
  await showInitialBackground();

  bgVideoEl = document.getElementById("background-video");
  if (bgVideoEl) {
    bgVideoEl.style.display = "none";
    bgVideoEl.style.pointerEvents = "none";
  }

  let lastMoveTry = 0;
  window.addEventListener("mousemove", () => {
    const now = Date.now();
    if (audioUnlocked) return;
    if (now - lastMoveTry < 700) return;
    lastMoveTry = now;
    attemptUnlockAudio();
  });

  window.addEventListener("pointerdown", attemptUnlockAudio, { once: true });
  window.addEventListener("keydown", attemptUnlockAudio, { once: true });
  window.addEventListener("touchstart", attemptUnlockAudio, { once: true });

  try {
    VanillaTilt.init(document.querySelectorAll(".tilt"), {
      max: 6,
      speed: 400,
      glare: true,
      reverse: true,
      "max-glare": 0.2
    });
  } catch {}

  try {
    Particles.init({
      selector: ".background",
      sizeVariations: 30,
      color: ["rgb(220, 220, 220)", "rgba(226, 226, 226, 0.5)", "rgba(255, 255, 255, 0.2)"]
    });
  } catch {}
});

window.addEventListener("load", async () => {
  const hasSession = localStorage.getItem("hasSession");
  const loading = document.getElementById("loading-screen");
  const main = document.getElementById("main-content");

  const waitInitial = Promise.race([initialReady, sleep(INITIAL_BG_MAX_WAIT_MS)]);
  await waitInitial;

  const showMain = async () => {
    preloadAllImages();
    scheduleBackgroundUpdates();

    if (loading) loading.style.display = "none";
    if (main) main.style.display = "flex";

    startVideoCycle();
  };

  if (hasSession) {
    await showMain();
    return;
  }

  setTimeout(() => {
    if (loading) loading.style.transform = "translateY(-100%)";
    setTimeout(() => {
      showMain();
    }, 2000);
  }, 2000);

  localStorage.setItem("hasSession", "1");
});