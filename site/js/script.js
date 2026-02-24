(() => {
  const BG_IMAGES = [
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

  const VIDEO_SCHEDULES = [
    { time: "4:44", loops: 10 },
    { time: "0:10", loops: 10 }
  ];

  const pseudoRandom = (seed) => {
    const x = Math.sin(seed * 9973) * 10000;
    return x - Math.floor(x);
  };

  const preloadImage = (src) => {
    const img = new Image();
    img.src = src;
    return img;
  };

  const safePlay = (video) => {
    const p = video.play();
    if (p && p.catch) p.catch(() => {});
  };

  const parseClock = (s) => {
    const parts = String(s).split(":").map((v) => parseInt(v, 10));
    if (parts.some((n) => Number.isNaN(n))) return null;
    return { h: parts[0] ?? 0, m: parts[1] ?? 0, sec: parts[2] ?? 0 };
  };

  const nextOccurrence = (clock) => {
    const now = new Date();
    const t = new Date(now.getFullYear(), now.getMonth(), now.getDate(), clock.h, clock.m, clock.sec, 0);
    if (t <= now) t.setDate(t.getDate() + 1);
    return t;
  };

  document.addEventListener("DOMContentLoaded", () => {
    const bgImage = document.getElementById("background-image");
    const bgVideo = document.getElementById("background-video");

    const updateBackground = () => {
      if (!bgImage) return;

      const now = new Date();
      const quarterSlot = now.getHours() * 4 + Math.floor(now.getMinutes() / 15);
      const index = Math.floor(pseudoRandom(quarterSlot) * BG_IMAGES.length);
      const newSrc = BG_IMAGES[index];

      bgImage.classList.add("fade-out");

      const pre = preloadImage(newSrc);
      const apply = () => {
        bgImage.src = newSrc;
        bgImage.classList.remove("fade-out");
      };

      if (pre.decode) {
        pre.decode().then(apply).catch(apply);
      } else {
        pre.onload = apply;
        pre.onerror = apply;
      }
    };

    updateBackground();

    {
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
    }

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

    document.addEventListener("contextmenu", (e) => {
      if (e.target && e.target.tagName === "IMG") e.preventDefault();
    });

    if (!bgVideo) return;

    bgVideo.src = VIDEO_SRC;
    bgVideo.preload = "auto";
    bgVideo.playsInline = true;
    bgVideo.loop = false;
    bgVideo.volume = 1.0;
    bgVideo.muted = true;
    bgVideo.style.display = "none";
    bgVideo.load();

    let audioUnlocked = false;
    const unlockAudioByMouseMove = () => {
      audioUnlocked = true;
      if (bgVideo.style.display !== "none") {
        bgVideo.muted = false;
        bgVideo.volume = 1.0;
        safePlay(bgVideo);
      }
    };

    window.addEventListener("mousemove", unlockAudioByMouseMove, { once: true });

    const ensureMetadata = () =>
      new Promise((resolve) => {
        if (bgVideo.readyState >= 1 && Number.isFinite(bgVideo.duration) && bgVideo.duration > 0) return resolve();
        bgVideo.addEventListener("loadedmetadata", () => resolve(), { once: true });
      });

    const playOnceFull = () =>
      new Promise(async (resolve) => {
        await ensureMetadata();

        try {
          bgVideo.currentTime = 0;
        } catch {}

        const onEnded = () => resolve();
        bgVideo.addEventListener("ended", onEnded, { once: true });

        if (audioUnlocked) {
          bgVideo.muted = false;
          try {
            const p = bgVideo.play();
            if (p && p.catch) await p;
          } catch {
            bgVideo.muted = true;
            try {
              const p2 = bgVideo.play();
              if (p2 && p2.catch) await p2;
              bgVideo.muted = false;
              bgVideo.volume = 1.0;
              safePlay(bgVideo);
            } catch {
              resolve();
            }
          }
        } else {
          bgVideo.muted = true;
          try {
            const p = bgVideo.play();
            if (p && p.catch) await p;
          } catch {
            resolve();
          }
        }
      });

    const queue = [];
    let running = false;

    const runNext = async () => {
      if (running) return;
      const job = queue.shift();
      if (!job) return;

      running = true;

      try {
        if (bgImage) bgImage.style.display = "none";
        bgVideo.style.display = "block";

        for (let i = 0; i < job.loops; i++) {
          await playOnceFull();
        }
      } finally {
        bgVideo.pause();
        bgVideo.style.display = "none";
        if (bgImage) {
          bgImage.style.display = "block";
          updateBackground();
        }
        running = false;
        runNext();
      }
    };

    const scheduleSlot = (slot) => {
      const clock = parseClock(slot.time);
      if (!clock) return;

      const next = nextOccurrence(clock);
      const ms = next.getTime() - Date.now();

      setTimeout(() => {
        queue.push({ loops: Math.max(1, parseInt(slot.loops, 10) || 1) });
        runNext();
        scheduleSlot(slot);
      }, ms);
    };

    VIDEO_SCHEDULES.forEach(scheduleSlot);
  });

  window.addEventListener("load", () => {
    const hasSession = localStorage.getItem("hasSession");
    const loading = document.getElementById("loading-screen");
    const main = document.getElementById("main-content");

    if (!loading || !main) return;

    if (hasSession) {
      loading.style.display = "none";
      main.style.display = "flex";
      return;
    }

    setTimeout(() => {
      loading.style.transform = "translateY(-100%)";
      setTimeout(() => {
        loading.style.display = "none";
        main.style.display = "flex";
      }, 2000);
    }, 2000);

    localStorage.setItem("hasSession", "1");
  });
})();