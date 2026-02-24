const bgImages = [
  "img/bg/VRChat_2024-12-22_20-41-00.313_1920x1080.png",
  "img/bg/VRChat_2025-07-03_22-41-17.728_1920x1080.png",
  "img/bg/VRChat_2025-07-09_23-19-15.486_1920x1080.png",
  "img/bg/VRChat_2025-06-28_22-17-19.163_1920x1080.png",
  "img/bg/VRChat_2025-06-16_21-21-12.591_1920x1080.png",
  "img/bg/VRChat_2025-06-02_20-59-04.228_3840x2160.png",
  "img/bg/VRChat_2025-05-29_22-52-10.961_3840x2160.png",
  "img/bg/VRChat_2025-05-25_00-51-51.329_1920x1080.png",
  "img/bg/VRChat_2025-05-24_21-45-24.260_1080x1920.png",
  "img/bg/VRChat_2025-05-05_23-33-27.167_1920x1080.png",
  "img/bg/VRChat_2025-04-27_17-04-30.188_1920x1080.png"
];

const VIDEO_SRC = "video/skull-edit1.2.mp4";
const VIDEO_INTERVAL_MINUTES = 1;
const VIDEO_LOOPS = 10;
const VIDEO_VOLUME = 0.8;

let bgImageEl = null;
let bgVideoEl = null;

let videoCycleStarted = false;
let audioAllowed = false;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const pseudoRandom = (seed) => {
  const x = Math.sin(seed * 9973) * 10000;
  return x - Math.floor(x);
};

const preload = (src) => {
  const img = new Image();
  img.src = src;
  return img;
};

const tryPlay = async (video) => {
  const p = video.play();
  if (p && p.then) await p;
};

const ensureMetadata = (video) =>
  new Promise((resolve) => {
    if (video.readyState >= 1 && Number.isFinite(video.duration) && video.duration > 0) return resolve();
    video.addEventListener("loadedmetadata", () => resolve(), { once: true });
  });

const playOnce = (video) =>
  new Promise((resolve) => {
    const done = () => resolve(true);
    const failed = () => resolve(false);

    const onEnded = () => done();

    video.addEventListener("ended", onEnded, { once: true });

    try {
      video.currentTime = 0;
    } catch {}

    try {
      const p = video.play();
      if (p && p.catch) {
        p.catch(() => {
          video.removeEventListener("ended", onEnded);
          failed();
        });
      }
    } catch {
      video.removeEventListener("ended", onEnded);
      failed();
    }
  });

const primeAutoplayWithSound = async (video) => {
  video.volume = VIDEO_VOLUME;
  video.muted = false;

  try {
    await tryPlay(video);
    audioAllowed = true;
    video.pause();
    try {
      video.currentTime = 0;
    } catch {}
    return;
  } catch {}

  audioAllowed = false;
  video.muted = true;

  try {
    await tryPlay(video);
    video.pause();
    try {
      video.currentTime = 0;
    } catch {}
  } catch {}
};

const playVideoLoopsThenHide = async (loops) => {
  if (!bgVideoEl) return;

  await ensureMetadata(bgVideoEl);

  if (bgImageEl) bgImageEl.style.display = "none";
  bgVideoEl.style.display = "block";

  for (let i = 0; i < loops; i++) {
    bgVideoEl.volume = VIDEO_VOLUME;

    if (audioAllowed) {
      bgVideoEl.muted = false;
      const ok = await playOnce(bgVideoEl);
      if (!ok) {
        bgVideoEl.muted = true;
        await playOnce(bgVideoEl);
      }
    } else {
      bgVideoEl.muted = true;
      await playOnce(bgVideoEl);
    }
  }

  bgVideoEl.pause();
  bgVideoEl.style.display = "none";
  if (bgImageEl) bgImageEl.style.display = "block";
};

const startVideoCycle = async () => {
  if (videoCycleStarted) return;
  videoCycleStarted = true;

  if (bgVideoEl) {
    bgVideoEl.src = VIDEO_SRC;
    bgVideoEl.preload = "auto";
    bgVideoEl.playsInline = true;
    bgVideoEl.loop = false;
    bgVideoEl.style.display = "none";
    bgVideoEl.load();
    await primeAutoplayWithSound(bgVideoEl);
  }

  const intervalMs = VIDEO_INTERVAL_MINUTES * 60 * 1000;

  while (true) {
    await sleep(intervalMs);
    await playVideoLoopsThenHide(Math.max(1, parseInt(VIDEO_LOOPS, 10) || 1));
  }
};

document.addEventListener("contextmenu", (e) => {
  if (e.target && e.target.tagName === "IMG") e.preventDefault();
});

document.addEventListener("DOMContentLoaded", () => {
  bgImageEl = document.getElementById("background-image");
  bgVideoEl = document.getElementById("background-video");

  const updateBackground = () => {
    if (!bgImageEl) return;

    const now = new Date();
    const quarterSlot = now.getHours() * 4 + Math.floor(now.getMinutes() / 15);
    const index = Math.floor(pseudoRandom(quarterSlot) * bgImages.length);
    const newSrc = bgImages[index];

    bgImageEl.classList.add("fade-out");

    const pre = preload(newSrc);
    const apply = () => {
      bgImageEl.src = newSrc;
      bgImageEl.classList.remove("fade-out");
    };

    if (pre.decode) {
      pre.decode().then(apply).catch(apply);
    } else {
      pre.onload = apply;
      pre.onerror = apply;
    }
  };

  updateBackground();

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

window.addEventListener("load", () => {
  const hasSession = localStorage.getItem("hasSession");
  const loading = document.getElementById("loading-screen");
  const main = document.getElementById("main-content");

  const startAfterShown = () => {
    startVideoCycle();
  };

  if (hasSession) {
    if (loading) loading.style.display = "none";
    if (main) main.style.display = "flex";
    startAfterShown();
  } else {
    setTimeout(() => {
      if (loading) loading.style.transform = "translateY(-100%)";
      setTimeout(() => {
        if (loading) loading.style.display = "none";
        if (main) main.style.display = "flex";
        startAfterShown();
      }, 2000);
    }, 2000);

    localStorage.setItem("hasSession", "1");
  }
});