import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  previousX: number;
  previousY: number;
  vx: number;
  vy: number;
  depth: number;
  size: number;
  phase: number;
  rgb: string;
}

const COLORS = ['155,124,255', '103,232,249', '224,120,244'];
const MAX_DPR = 1.5;

function seededRandom(seed: number) {
  let value = seed;
  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296;
    return value / 4294967296;
  };
}

function createParticles(width: number, height: number): Particle[] {
  const random = seededRandom(Math.round(width * 13 + height * 7));
  const count = Math.min(118, Math.max(44, Math.round((width * height) / 18_000)));

  return Array.from({ length: count }, () => {
    const depth = 0.25 + random() * 0.75;
    const y = height * (0.32 + random() * 0.64);
    const x = random() * width;
    return {
      x,
      y,
      previousX: x,
      previousY: y,
      vx: (random() - 0.5) * 0.18,
      vy: (random() - 0.5) * 0.08,
      depth,
      size: 0.5 + depth * 1.4,
      phase: random() * Math.PI * 2,
      rgb: COLORS[Math.floor(random() * COLORS.length)]
    };
  });
}

function drawFieldLines(context: CanvasRenderingContext2D, width: number, height: number) {
  const horizon = height * 0.6;
  context.save();
  context.lineWidth = 0.5;
  context.strokeStyle = 'rgba(167,124,255,0.045)';

  for (let index = 0; index < 8; index += 1) {
    const progress = index / 7;
    const y = horizon + Math.pow(progress, 1.55) * height * 0.34;
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(width, y);
    context.stroke();
  }

  context.strokeStyle = 'rgba(103,232,249,0.028)';
  for (let index = -5; index <= 5; index += 1) {
    context.beginPath();
    context.moveTo(width / 2 + index * width * 0.08, horizon);
    context.lineTo(width / 2 + index * width * 0.34, height);
    context.stroke();
  }
  context.restore();
}

/** Lightweight canvas atmosphere inspired by USNEE's nocturnal field aesthetic. */
export function AmbientField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return undefined;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let particles: Particle[] = [];
    let animationFrame = 0;
    let lastTime = 0;
    let burst = 0;
    let reducedMotion = false;
    const scrollState = { current: 0, target: 0 };
    const pointer = { x: -10_000, y: -10_000, active: false };

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      particles = createParticles(width, height);
      draw(0);
    };

    const draw = (time: number) => {
      const delta = Math.min((time - lastTime) / 1000, 0.05) || 0;
      lastTime = time;
      const speed = reducedMotion ? 0 : 1 + burst * 2.5;
      burst = Math.max(0, burst - delta * 0.55);
      scrollState.current += (scrollState.target - scrollState.current) * Math.min(1, delta * 8);

      context.clearRect(0, 0, width, height);
      drawFieldLines(context, width, height);

      for (const particle of particles) {
        particle.previousX = particle.x;
        particle.previousY = particle.y;
        const dx = particle.x - pointer.x;
        const dy = particle.y - pointer.y;
        const distance = Math.hypot(dx, dy);

        if (pointer.active && distance < 180) {
          const force = ((180 - distance) / 180) * particle.depth * 4;
          particle.vx += (dx / Math.max(distance, 1)) * force * delta;
          particle.vy += (dy / Math.max(distance, 1)) * force * delta;
        }

        particle.vx += Math.sin(time * 0.00035 + particle.phase + scrollState.current * 2) * 0.003 * speed;
        particle.vy += Math.cos(time * 0.00027 + particle.phase) * 0.002 * speed;
        particle.x += scrollState.current * particle.depth * 0.025;
        particle.vx *= 0.992;
        particle.vy *= 0.992;
        particle.x += particle.vx * speed * 60 * delta;
        particle.y += particle.vy * speed * 60 * delta;

        if (particle.x < -20) particle.x = width + 20;
        if (particle.x > width + 20) particle.x = -20;
        if (particle.y < height * 0.25) particle.y = height * 0.9;
        if (particle.y > height * 0.95) particle.y = height * 0.28;

        const pulse = 0.72 + Math.sin(time * 0.001 + particle.phase) * 0.28;
        const alpha = (0.045 + particle.depth * 0.14) * pulse;
        context.strokeStyle = `rgba(${particle.rgb},${alpha})`;
        context.fillStyle = `rgba(${particle.rgb},${alpha + 0.04})`;
        context.lineWidth = Math.max(0.45, particle.size * 0.55);
        context.beginPath();
        context.moveTo(particle.previousX, particle.previousY);
        context.lineTo(particle.x, particle.y);
        context.stroke();
        context.beginPath();
        context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        context.fill();
      }

      if (!reducedMotion) animationFrame = window.requestAnimationFrame(draw);
    };

    const updatePointer = (x: number, y: number) => {
      pointer.x = x;
      pointer.y = y;
      pointer.active = true;
    };
    const handlePointerMove = (event: PointerEvent) => updatePointer(event.clientX, event.clientY);
    const handlePointerLeave = () => { pointer.active = false; };
    const handlePointerDown = (event: PointerEvent) => {
      if ((event.target as HTMLElement | null)?.closest('button, a, [role="button"]')) burst = 1;
    };
    const handleBurst = () => { burst = 1; };
    const scrollContainer = document.querySelector<HTMLElement>('.app-scroll');
    const handleScroll = () => {
      if (!scrollContainer) return;
      const maxScroll = Math.max(1, scrollContainer.scrollHeight - scrollContainer.clientHeight);
      scrollState.target = Math.min(1, Math.max(0, scrollContainer.scrollTop / maxScroll));
    };
    const motionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const handleMotionChange = (event: MediaQueryListEvent) => {
      reducedMotion = event.matches;
      window.cancelAnimationFrame(animationFrame);
      draw(0);
    };

    reducedMotion = motionQuery?.matches ?? false;
    resize();
    window.addEventListener('resize', resize, { passive: true });
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerleave', handlePointerLeave, { passive: true });
    window.addEventListener('pointerdown', handlePointerDown, { passive: true });
    scrollContainer?.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('usnee:ambient-burst', handleBurst);
    motionQuery?.addEventListener('change', handleMotionChange);
    if (!reducedMotion) animationFrame = window.requestAnimationFrame(draw);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerleave', handlePointerLeave);
      window.removeEventListener('pointerdown', handlePointerDown);
      scrollContainer?.removeEventListener('scroll', handleScroll);
      window.removeEventListener('usnee:ambient-burst', handleBurst);
      motionQuery?.removeEventListener('change', handleMotionChange);
    };
  }, []);

  return <canvas ref={canvasRef} className="ambient-field" aria-hidden="true" />;
}
