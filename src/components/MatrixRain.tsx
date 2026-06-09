import { useRef, useEffect, useCallback } from 'react';

interface MatrixRainProps {
  /** CSS color of the falling characters — default matrix green */
  color?: string;
  /** Minimum font size in px */
  minFontSize?: number;
  /** Maximum font size in px */
  maxFontSize?: number;
  /** Minimum opacity */
  minOpacity?: number;
  /** Maximum opacity */
  maxOpacity?: number;
  /** Speed multiplier (higher = faster) — default 1 */
  speed?: number;
  /** Chance (0-1) that a character changes each frame */
  mutationRate?: number;
  /** Whether to show the scanline CRT overlay */
  scanlines?: boolean;
  /** z-index of the container */
  zIndex?: number;
}

interface Drop {
  x: number;
  y: number;
  fontSize: number;
  opacity: number;
  speed: number;
  chars: string[];
  charIndex: number;
  trailLength: number;
}

const BINARY_CHARS = '01';
const EXTRA_CHARS = '01アイウエオカキクケコサシスセソタチツテトナニヌネノ';

function randomChar(): string {
  return BINARY_CHARS[Math.floor(Math.random() * BINARY_CHARS.length)];
}

function randomExtraChar(): string {
  return EXTRA_CHARS[Math.floor(Math.random() * EXTRA_CHARS.length)];
}

export default function MatrixRain({
  color = '#00FF41',
  minFontSize = 12,
  maxFontSize = 18,
  minOpacity = 0.05,
  maxOpacity = 0.75,
  speed = 1,
  mutationRate = 0.03,
  scanlines = true,
  zIndex = 0,
}: MatrixRainProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const dropsRef = useRef<Drop[]>([]);
  const lastTimeRef = useRef<number>(0);
  const isVisibleRef = useRef<boolean>(true);

  const createDrop = useCallback((canvasWidth: number, canvasHeight: number, startX?: number): Drop => {
    const fontSize = minFontSize + Math.random() * (maxFontSize - minFontSize);
    const trailLength = 8 + Math.floor(Math.random() * 18);
    const chars: string[] = [];
    for (let i = 0; i < trailLength; i++) {
      chars.push(Math.random() < 0.85 ? randomChar() : randomExtraChar());
    }
    return {
      x: startX !== undefined ? startX : Math.random() * canvasWidth,
      y: -Math.random() * canvasHeight * 0.8 - fontSize * trailLength,
      fontSize,
      opacity: minOpacity + Math.random() * (maxOpacity - minOpacity),
      speed: (0.4 + Math.random() * 1.6) * speed,
      chars,
      charIndex: 0,
      trailLength,
    };
  }, [minFontSize, maxFontSize, minOpacity, maxOpacity, speed]);

  const initDrops = useCallback((canvasWidth: number, canvasHeight: number) => {
    const count = Math.floor(canvasWidth / 14);
    const drops: Drop[] = [];
    const spacing = canvasWidth / count;
    for (let i = 0; i < count; i++) {
      const drop = createDrop(canvasWidth, canvasHeight, i * spacing + (Math.random() - 0.5) * spacing * 0.5);
      // Stagger initial y positions across the full canvas height
      drop.y = -Math.random() * canvasHeight * 1.5;
      drops.push(drop);
    }
    dropsRef.current = drops;
  }, [createDrop]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      if (dropsRef.current.length === 0) {
        initDrops(canvas.width, canvas.height);
      }
    };

    resize();
    window.addEventListener('resize', resize);

    // Visibility change — pause when tab hidden
    const handleVisibility = () => {
      isVisibleRef.current = !document.hidden;
      if (isVisibleRef.current) {
        lastTimeRef.current = performance.now();
        animRef.current = requestAnimationFrame(draw);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    function draw(now: number) {
      if (!isVisibleRef.current || !ctx || !canvas) return;

      const delta = Math.min((now - lastTimeRef.current) / 16.67, 3); // cap at 3x to avoid jumps
      lastTimeRef.current = now;

      // Fade the previous frame — creates the trailing effect
      ctx.fillStyle = 'rgba(0, 0, 0, 0.06)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const drops = dropsRef.current;

      for (let i = 0; i < drops.length; i++) {
        const drop = drops[i];

        // Draw trail
        for (let j = 0; j < drop.trailLength; j++) {
          const charY = drop.y - j * drop.fontSize;
          if (charY < -drop.fontSize || charY > canvas.height + drop.fontSize) continue;

          const trailFade = 1 - j / drop.trailLength;
          const alpha = drop.opacity * trailFade;

          if (j === 0) {
            // Head character — brighter, slight glow
            ctx.shadowColor = color;
            ctx.shadowBlur = 8;
            ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(alpha * 1.5, 1)})`;
          } else {
            ctx.shadowBlur = 0;
            ctx.fillStyle = hexToRgba(color, alpha);
          }

          ctx.font = `${drop.fontSize}px 'JetBrains Mono', 'Fira Code', 'Courier New', monospace`;
          ctx.fillText(drop.chars[j], drop.x, charY);
        }

        ctx.shadowBlur = 0;

        // Move drop down
        drop.y += drop.speed * delta * 1.2;

        // Mutate characters occasionally
        if (Math.random() < mutationRate * delta) {
          const idx = Math.floor(Math.random() * drop.chars.length);
          drop.chars[idx] = Math.random() < 0.8 ? randomChar() : randomExtraChar();
        }

        // Reset drop when it falls off screen
        if (drop.y - drop.trailLength * drop.fontSize > canvas.height) {
          const newDrop = createDrop(canvas.width, canvas.height, drop.x);
          newDrop.y = -newDrop.fontSize * newDrop.trailLength * Math.random();
          drops[i] = newDrop;
        }
      }

      animRef.current = requestAnimationFrame(draw);
    }

    lastTimeRef.current = performance.now();
    animRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', handleVisibility);
      cancelAnimationFrame(animRef.current);
    };
  }, [color, mutationRate, initDrops, createDrop]);

  // Parse hex color to rgba helper
  function hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex, overflow: 'hidden', pointerEvents: 'none' }}>
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%' }}
      />
      {/* CRT scanline overlay */}
      {scanlines && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.15) 0px, rgba(0,0,0,0.15) 1px, transparent 1px, transparent 3px)',
            mixBlendMode: 'multiply',
            opacity: 0.5,
          }}
        />
      )}
    </div>
  );
}
