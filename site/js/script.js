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

document.addEventListener("DOMContentLoaded", function () {
  const bgImage = document.getElementById("background-image");

  function pseudoRandom(seed) {
    const x = Math.sin(seed * 9973) * 10000;
    return x - Math.floor(x);
  }

  function updateBackground() {
    const now = new Date();
    const quarterSlot = now.getHours() * 4 + Math.floor(now.getMinutes() / 15);
    const index = Math.floor(pseudoRandom(quarterSlot) * bgImages.length);
    const newSrc = bgImages[index];

    bgImage.classList.add("fade-out");

    setTimeout(() => {
      bgImage.src = newSrc;
      bgImage.classList.remove("fade-out");
    }, 1000);
  }

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

  VanillaTilt.init(document.querySelectorAll(".tilt"), {
    max: 6,
    speed: 400,
    glare: true,
    reverse: true,
    "max-glare": 0.2
  });

  Particles.init({
    selector: '.background',
    sizeVariations: 30,
    color: [
      'rgb(220, 220, 220)', 'rgba(226, 226, 226, 0.5)', 'rgba(255, 255, 255, 0.2)'
    ]
  });
});

window.addEventListener('load', () => {
  const hasSession = localStorage.getItem("hasSession");
  const loading = document.getElementById('loading-screen');
  const main = document.getElementById('main-content');

  if (hasSession) {
    // セッションがあればロード画面をスキップ
    loading.style.display = 'none';
    main.style.display = 'flex';
  } else {
    // セッションがなければロード画面表示し、アニメーション実行
    setTimeout(() => {
      loading.style.transform = 'translateY(-100%)';
      setTimeout(() => {
        loading.style.display = 'none';
        main.style.display = 'flex';
      }, 2000);
    }, 2000);

    // 表示済みセッションを記録（次回からスキップ）
    localStorage.setItem("hasSession", "1");
  }
});
