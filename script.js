const root = document.documentElement;
const canvas = document.querySelector("#scene");
const ctx = canvas.getContext("2d");
const glow = document.querySelector(".cursor-glow");
const core = document.querySelector(".energy-core");
const stage = document.querySelector(".hero-stage");

let width = 0;
let height = 0;
let particles = [];
let sparks = [];
let pointer = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
let corePosition = { x: 0, y: 0 };
let velocity = { x: 1.8, y: -1.2 };
let dragging = false;
let dragOffset = { x: 0, y: 0 };
let lastSparkAt = 0;

if (localStorage.getItem("theme") === "dark") {
  root.classList.add("dark");
}

document.querySelector(".mode-button").addEventListener("click", () => {
  root.classList.toggle("dark");
  localStorage.setItem("theme", root.classList.contains("dark") ? "dark" : "light");
});

document.querySelector("#year").textContent = new Date().getFullYear();

function resize() {
  const scale = window.devicePixelRatio || 1;
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = Math.floor(width * scale);
  canvas.height = Math.floor(height * scale);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);

  particles = Array.from({ length: Math.min(110, Math.floor(width / 12)) }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * 0.35,
    vy: (Math.random() - 0.5) * 0.35,
    r: Math.random() * 1.7 + 0.4
  }));

  centerCore();
}

function centerCore() {
  const stageRect = stage.getBoundingClientRect();
  const coreRect = core.getBoundingClientRect();
  if (!corePosition.x && !corePosition.y) {
    corePosition.x = stageRect.left + stageRect.width / 2 - coreRect.width / 2;
    corePosition.y = stageRect.top + stageRect.height / 2 - coreRect.height / 2;
    applyCorePosition();
  }
}

function applyCorePosition() {
  const stageRect = stage.getBoundingClientRect();
  core.style.left = `${corePosition.x - stageRect.left}px`;
  core.style.top = `${corePosition.y - stageRect.top}px`;
}

function keepCoreInStage() {
  const stageRect = stage.getBoundingClientRect();
  const coreRect = core.getBoundingClientRect();
  const maxX = stageRect.right - coreRect.width;
  const maxY = stageRect.bottom - coreRect.height;
  const minX = stageRect.left;
  const minY = stageRect.top;

  if (corePosition.x < minX || corePosition.x > maxX) {
    velocity.x *= -0.88;
    burst(corePosition.x + coreRect.width / 2, corePosition.y + coreRect.height / 2, 12);
  }
  if (corePosition.y < minY || corePosition.y > maxY) {
    velocity.y *= -0.88;
    burst(corePosition.x + coreRect.width / 2, corePosition.y + coreRect.height / 2, 12);
  }

  corePosition.x = Math.max(minX, Math.min(maxX, corePosition.x));
  corePosition.y = Math.max(minY, Math.min(maxY, corePosition.y));
}

function burst(x, y, amount = 28) {
  core.classList.add("pulse");
  window.setTimeout(() => core.classList.remove("pulse"), 180);
  for (let i = 0; i < amount; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.5 + Math.random() * 5;
    sparks.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 40 + Math.random() * 20,
      r: 1 + Math.random() * 3
    });
  }
}

function draw() {
  ctx.clearRect(0, 0, width, height);
  const accent = getComputedStyle(root).getPropertyValue("--accent").trim();
  const muted = root.classList.contains("dark") ? "rgba(246,242,232,0.25)" : "rgba(22,24,29,0.25)";

  particles.forEach((particle, index) => {
    const dx = pointer.x - particle.x;
    const dy = pointer.y - particle.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 180) {
      particle.vx -= dx * 0.00001;
      particle.vy -= dy * 0.00001;
    }

    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.vx *= 0.995;
    particle.vy *= 0.995;

    if (particle.x < 0 || particle.x > width) particle.vx *= -1;
    if (particle.y < 0 || particle.y > height) particle.vy *= -1;

    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.r, 0, Math.PI * 2);
    ctx.fillStyle = muted;
    ctx.fill();

    for (let j = index + 1; j < particles.length; j += 1) {
      const other = particles[j];
      const gap = Math.hypot(particle.x - other.x, particle.y - other.y);
      if (gap < 105) {
        ctx.globalAlpha = (105 - gap) / 105 * 0.28;
        ctx.beginPath();
        ctx.moveTo(particle.x, particle.y);
        ctx.lineTo(other.x, other.y);
        ctx.strokeStyle = accent;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
  });

  sparks = sparks.filter((spark) => spark.life > 0);
  sparks.forEach((spark) => {
    spark.x += spark.vx;
    spark.y += spark.vy;
    spark.vx *= 0.96;
    spark.vy *= 0.96;
    spark.life -= 1;
    ctx.globalAlpha = Math.max(0, spark.life / 60);
    ctx.beginPath();
    ctx.arc(spark.x, spark.y, spark.r, 0, Math.PI * 2);
    ctx.fillStyle = accent;
    ctx.fill();
    ctx.globalAlpha = 1;
  });

  if (!dragging) {
    corePosition.x += velocity.x;
    corePosition.y += velocity.y;
    velocity.y += 0.035;
    keepCoreInStage();
    applyCorePosition();
  }

  requestAnimationFrame(draw);
}

function movePointer(x, y) {
  pointer = { x, y };
  glow.style.setProperty("--x", `${x}px`);
  glow.style.setProperty("--y", `${y}px`);
}

window.addEventListener("pointermove", (event) => {
  movePointer(event.clientX, event.clientY);
  const now = performance.now();
  if (now - lastSparkAt > 34) {
    lastSparkAt = now;
    const spark = document.createElement("span");
    spark.className = "pointer-spark";
    spark.style.left = `${event.clientX}px`;
    spark.style.top = `${event.clientY}px`;
    spark.style.setProperty("--dx", `${(Math.random() - 0.5) * 28}px`);
    spark.style.setProperty("--dy", `${(Math.random() - 0.5) * 28}px`);
    document.body.appendChild(spark);
    window.setTimeout(() => spark.remove(), 700);
  }
});

core.addEventListener("pointerdown", (event) => {
  dragging = true;
  document.body.classList.add("dragging");
  core.setPointerCapture(event.pointerId);
  const rect = core.getBoundingClientRect();
  dragOffset.x = event.clientX - rect.left;
  dragOffset.y = event.clientY - rect.top;
  velocity = { x: 0, y: 0 };
});

core.addEventListener("pointermove", (event) => {
  if (!dragging) return;
  const previous = { ...corePosition };
  corePosition.x = event.clientX - dragOffset.x;
  corePosition.y = event.clientY - dragOffset.y;
  keepCoreInStage();
  velocity.x = (corePosition.x - previous.x) * 0.42;
  velocity.y = (corePosition.y - previous.y) * 0.42;
  applyCorePosition();
  burst(event.clientX, event.clientY, 2);
});

core.addEventListener("pointerup", (event) => {
  dragging = false;
  document.body.classList.remove("dragging");
  core.releasePointerCapture(event.pointerId);
  burst(event.clientX, event.clientY, 34);
});

core.addEventListener("click", (event) => {
  burst(event.clientX, event.clientY, 42);
});

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) entry.target.classList.add("visible");
  });
}, { threshold: 0.18 });

document.querySelectorAll("[data-reveal]").forEach((item) => revealObserver.observe(item));

const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting || entry.target.dataset.done) return;
    entry.target.dataset.done = "true";
    const target = Number(entry.target.dataset.count);
    const decimals = Number.isInteger(target) ? 0 : 1;
    const started = performance.now();
    const duration = 1300;

    function tick(now) {
      const progress = Math.min((now - started) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      entry.target.textContent = (target * eased).toFixed(decimals);
      if (progress < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  });
}, { threshold: 0.6 });

document.querySelectorAll("[data-count]").forEach((counter) => counterObserver.observe(counter));

document.querySelectorAll(".tilt").forEach((card) => {
  card.addEventListener("pointermove", (event) => {
    const rect = card.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const rotateX = ((y / rect.height) - 0.5) * -9;
    const rotateY = ((x / rect.width) - 0.5) * 9;
    card.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
  });
  card.addEventListener("pointerleave", () => {
    card.style.transform = "perspective(900px) rotateX(0) rotateY(0)";
  });
});

const sections = [...document.querySelectorAll("main section[id]")];
const navLinks = [...document.querySelectorAll(".nav a")];
window.addEventListener("scroll", () => {
  let current = null;
  sections.forEach((section) => {
    if (section.getBoundingClientRect().top < window.innerHeight * 0.35) {
      current = section;
    }
  });
  if (!current) return;
  navLinks.forEach((link) => {
    link.classList.toggle("active", link.getAttribute("href") === `#${current.id}`);
  });
}, { passive: true });

window.addEventListener("resize", resize);
resize();
movePointer(pointer.x, pointer.y);
draw();
