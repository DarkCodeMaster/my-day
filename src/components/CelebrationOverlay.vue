<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from 'vue';
import { useCelebration, consumeCelebration } from '@/composables/useCelebration';
import type { AchievementTier } from '@/composables/useCelebration';

/* 成就解锁庆祝：全屏 canvas 粒子烟花（吸血鬼幸存者开宝箱式爆发）。
 * 粒子三型：星星（动森星星碎片）/ 圆点（彩纸）/ 叶片（呼应 Tabs leaf-animation），
 * 配色取主题色板，按成就 tier 缩放爆发规模。 */

const { queue } = useCelebration();

const canvasRef = ref<HTMLCanvasElement | null>(null);
let ctx: CanvasRenderingContext2D | null = null;
let dpr = 1;
let rafId = 0;
let running = false;
let processing = false;
const timers: number[] = [];

type ParticleType = 'star' | 'dot' | 'leaf';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  type: ParticleType;
  rotation: number;
  spin: number;
  life: number;
  maxLife: number;
  twinkle: number;
}

const COLORS = ['#19c8b9', '#e6b93d', '#6fba2c', '#f2a0b5', '#f5c99b', '#ffffff'];
const TYPES: ParticleType[] = ['star', 'dot', 'leaf'];
const GRAVITY = 0.12;
const DRAG = 0.985;

const particles: Particle[] = [];

/** tier 爆发编排：dx 为相对屏幕中心的水平偏移比例，delay 毫秒 */
const TIER_BURSTS: Record<AchievementTier, { dx: number; count: number; delay: number }[]> = {
  bronze: [{ dx: 0, count: 40, delay: 0 }],
  silver: [{ dx: 0, count: 70, delay: 0 }],
  gold: [
    { dx: 0, count: 110, delay: 0 },
    { dx: 0, count: 50, delay: 260 },
  ],
  platinum: [
    { dx: 0, count: 110, delay: 0 },
    { dx: -0.28, count: 80, delay: 200 },
    { dx: 0.28, count: 80, delay: 400 },
  ],
};

const spawnBurst = (cx: number, cy: number, count: number) => {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 7;
    const maxLife = 70 + Math.random() * 50; // 约 1.2-2 秒
    particles.push({
      x: cx,
      y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2.5, // 向上偏置
      size: 3 + Math.random() * 5,
      color: COLORS[(Math.random() * COLORS.length) | 0],
      type: TYPES[(Math.random() * TYPES.length) | 0],
      rotation: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.25,
      life: maxLife,
      maxLife,
      twinkle: Math.random() * Math.PI * 2,
    });
  }
};

const starPath = (c: CanvasRenderingContext2D, r: number) => {
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? r : r * 0.45;
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) c.moveTo(x, y);
    else c.lineTo(x, y);
  }
  c.closePath();
};

const drawParticle = (c: CanvasRenderingContext2D, p: Particle) => {
  c.save();
  c.translate(p.x, p.y);
  c.rotate(p.rotation);
  if (p.type === 'dot') {
    c.beginPath();
    c.arc(0, 0, p.size * 0.5, 0, Math.PI * 2);
    c.fill();
  } else if (p.type === 'leaf') {
    c.beginPath();
    c.ellipse(0, 0, p.size, p.size * 0.45, 0, 0, Math.PI * 2);
    c.fill();
  } else {
    starPath(c, p.size);
    c.fill();
  }
  c.restore();
};

const tick = () => {
  const canvas = canvasRef.value;
  if (!canvas || !ctx) {
    running = false;
    return;
  }
  const w = canvas.width / dpr;
  const h = canvas.height / dpr;
  ctx.clearRect(0, 0, w, h);
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.vx *= DRAG;
    p.vy = p.vy * DRAG + GRAVITY;
    p.x += p.vx;
    p.y += p.vy;
    p.rotation += p.spin;
    p.life--;
    if (p.life <= 0 || p.y > h + 30) {
      particles.splice(i, 1);
      continue;
    }
    const fade = Math.min(1, p.life / (p.maxLife * 0.4)); // 尾部渐隐
    // 星星/叶片闪烁，圆点常亮
    const tw = p.type === 'dot' ? 1 : 0.55 + 0.45 * Math.sin(p.twinkle + p.life * 0.35);
    ctx.globalAlpha = fade * tw;
    ctx.fillStyle = p.color;
    drawParticle(ctx, p);
  }
  ctx.globalAlpha = 1;
  if (particles.length) {
    rafId = requestAnimationFrame(tick);
  } else {
    running = false;
    ctx.clearRect(0, 0, w, h);
  }
};

const startLoop = () => {
  if (!running) {
    running = true;
    rafId = requestAnimationFrame(tick);
  }
};

/** 队列消费：每个成就错开 250ms 播放，tier 内部的多段爆发按各自 delay */
const processQueue = () => {
  const burst = queue[0];
  if (!burst) {
    processing = false;
    return;
  }
  processing = true;
  consumeCelebration(burst.id);
  const canvas = canvasRef.value;
  if (canvas) {
    const w = canvas.width / dpr;
    const cy = (canvas.height / dpr) * 0.38; // 屏幕中心偏上
    for (const b of TIER_BURSTS[burst.tier]) {
      timers.push(
        window.setTimeout(() => {
          spawnBurst(w * (0.5 + b.dx), cy, b.count);
          startLoop();
        }, b.delay),
      );
    }
  }
  timers.push(window.setTimeout(processQueue, 250));
};

watch(
  () => queue.length,
  () => {
    if (!processing) processQueue();
  },
);

const resize = () => {
  const canvas = canvasRef.value;
  if (!canvas) return;
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
};

onMounted(() => {
  ctx = canvasRef.value?.getContext('2d') ?? null;
  resize();
  window.addEventListener('resize', resize);
});

onBeforeUnmount(() => {
  cancelAnimationFrame(rafId);
  timers.forEach((t) => clearTimeout(t));
  window.removeEventListener('resize', resize);
  particles.length = 0;
  running = false;
});
</script>

<template>
  <canvas ref="canvasRef" class="celebration-canvas"></canvas>
</template>

<style scoped>
.celebration-canvas {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  z-index: 3000;
}
</style>
