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
const VIDEO_INTERVAL_MINUTES = 5;
const VIDEO_LOOPS = 3;
const VIDEO_VOLUME = 0.2;

const TRANSPARENT_PIXEL = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

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

const imageCache = new Map();

const preloadImage = (src) => {
  if (imageCache.has(src)) return imageCache.get(src);

  const p = new Promise((resolve) => {
    const img = new Image();

    const doneOk = () => resolve(true);
    const doneNg = () => resolve(false);

    img.onload = doneOk;
    img.onerror = doneNg;
    img.src = src;

    if (img.decode) {
      img.decode().then(doneOk).catch(() => {});
    }
  });

  imageCache.set(src, p);
  return p;
};

let bgImageEl = null;
let bgVideoEl = null;

let initialBgSrc = null;
let initialBgReady = null;

let wantSound = false;
let strongGesture = false;

let videoCycleStarted = false;
let videoSessionActive = false;

const decideInitialBg = () => {
  const now = new Date();
  const slot = quarterSlot(now);
  const current = imageBySlot(slot);
  const next = imageBySlot(slot + 1);
  initialBgSrc = current;
  initialBgReady = preloadImage(current);
  preloadImage(next);
};

decideInitialBg();

const applyInitialBackground = async () => {
  if (!bgImageEl) return false;

  const ok = await initialBgReady;
  if (ok) {
    bgImageEl.classList.remove("fade-out");
    bgImageEl.src = initialBgSrc;
    bgImageEl.style.opacity = "1";
    return true;
  }

  bgImageEl.style.opacity = "1";
  return false;
};

const updateBackground = async () => {
  if (!bgImageEl) return;

  const now = new Date();
  const slot = quarterSlot(now);
  const current = imageBySlot(slot);
  const next = imageBySlot(slot + 1);

  preloadImage(next);

  const ok = await preloadImage(current);
  if (!ok) return;

  bgImageEl.classList.add("fade-out");
  await sleep(10);
  bgImageEl.src = current;
  bgImageEl.classList.remove("fade-out");
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

const preloadAllImages = async () => {
  for (const src of bgImages) {
    preloadImage(src);
    await sleep(0);
  }
};

const ensureMetadata = (video) =>
  new Promise((resolve) => {
    if (video.readyState >= 1 && Number.isFinite(video.duration) && video.duration > 0) return resolve();
    video.addEventListener("loadedmetadata", () => resolve(), { once: true });
  });

const safePlay = async (video) => {
  const p = video.play();
  if (p && p.catch) {
    await p;
    return true;
  }
  return true;
};

const tryUnmuteDuringPlayback = async () => {
  if (!bgVideoEl) return;
  if (!videoSessionActive) return;
  if (bgVideoEl.paused) return;

  bgVideoEl.volume = VIDEO_VOLUME;

  try {
    bgVideoEl.muted = false;
    await safePlay(bgVideoEl);
    await sleep(80);
    if (!bgVideoEl.paused && !bgVideoEl.muted) return;
    bgVideoEl.muted = true;
  } catch {
    bgVideoEl.muted = true;
  }
};

const waitEndedOrTimeout = (video, msMax) =>
  new Promise((resolve) => {
    const onEnded = () => resolve(true);
    video.addEventListener("ended", onEnded, { once: true });
    setTimeout(() => resolve(false), msMax);
  });

const playOne = async (video) => {
  try {
    video.currentTime = 0;
  } catch {}

  video.muted = true;
  video.volume = VIDEO_VOLUME;

  try {
    await safePlay(video);
  } catch {
    return false;
  }

  if (strongGesture || wantSound) {
    tryUnmuteDuringPlayback();
  }

  const msMax = Math.max(4000, Math.floor((video.duration || 13) * 1000 + 2500));
  await waitEndedOrTimeout(video, msMax);
  return true;
};

const playVideoLoopsThenHide = async (loops) => {
  if (!bgVideoEl) return;

  await ensureMetadata(bgVideoEl);

  videoSessionActive = true;

  if (bgImageEl) bgImageEl.style.display = "none";
  bgVideoEl.style.display = "block";

  for (let i = 0; i < loops; i++) {
    await playOne(bgVideoEl);
  }

  videoSessionActive = false;

  bgVideoEl.pause();
  bgVideoEl.style.display = "none";
  if (bgImageEl) bgImageEl.style.display = "block";
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

  bgVideoEl.addEventListener("pause", () => {
    if (!videoSessionActive) return;
    if (bgVideoEl.ended) return;
    if (Number.isFinite(bgVideoEl.duration) && bgVideoEl.currentTime >= bgVideoEl.duration - 0.05) return;

    bgVideoEl.muted = true;
    bgVideoEl.volume = VIDEO_VOLUME;
    safePlay(bgVideoEl);
  });

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

let initialAppliedResolve = null;
const initialApplied = new Promise((r) => (initialAppliedResolve = r));

document.addEventListener("DOMContentLoaded", async () => {
  bgImageEl = document.getElementById("background-image");
  bgVideoEl = document.getElementById("background-video");

  if (bgImageEl) {
    if (!bgImageEl.getAttribute("src") || bgImageEl.getAttribute("src") === "") {
      bgImageEl.src = TRANSPARENT_PIXEL;
    }
    bgImageEl.style.opacity = "0";
    bgImageEl.style.transition = "opacity 120ms ease";
  }

  if (bgVideoEl) {
    bgVideoEl.style.display = "none";
    bgVideoEl.style.pointerEvents = "none";
  }

  const ok = await applyInitialBackground();
  initialAppliedResolve(Boolean(ok));

  window.addEventListener("mousemove", () => {
    wantSound = true;
    tryUnmuteDuringPlayback();
  }, { once: true });

  const strong = () => {
    wantSound = true;
    strongGesture = true;
    tryUnmuteDuringPlayback();
  };

  window.addEventListener("pointerdown", strong, { once: true });
  window.addEventListener("keydown", strong, { once: true });
  window.addEventListener("touchstart", strong, { once: true });

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

  const waitBg = Promise.race([initialApplied, sleep(8000)]);
  const minWait = hasSession ? sleep(0) : sleep(2000);

  await Promise.all([waitBg, minWait]);

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

  if (loading) loading.style.transform = "translateY(-100%)";
  await sleep(2000);

  await showMain();
  localStorage.setItem("hasSession", "1");
});