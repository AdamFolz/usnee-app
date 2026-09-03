import { useEffect, useMemo, useState } from 'react';

const CONFETTI_COLORS = ['#7c5cff', '#00e5a0', '#ffb020', '#ff5c8a', '#38bdf8'];

const PIECE_COUNT = 24;

/**
 * One-shot confetti burst. Mount with `burstKey` change to replay.
 * Pure CSS transform animations — GPU-only, no re-render loops.
 */
export function ConfettiBurst({ burstKey, active }: { burstKey: number; active: boolean }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!active) return;
    setVisible(true);
    const timer = window.setTimeout(() => setVisible(false), 1300);
    return () => window.clearTimeout(timer);
  }, [burstKey, active]);

  const pieces = useMemo(
    () =>
      Array.from({ length: PIECE_COUNT }, (_, i) => {
        const angle = (i / PIECE_COUNT) * Math.PI * 2 + Math.random() * 0.5;
        const distance = 60 + Math.random() * 70;
        return {
          id: i,
          cx: `${Math.cos(angle) * distance}px`,
          cy: `${Math.sin(angle) * distance - 40}px`,
          cr: `${Math.round(Math.random() * 720 - 360)}deg`,
          color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
          delay: `${Math.round(Math.random() * 120)}ms`
        };
      }),
    // regenerate geometry per burst
    [burstKey, active]
  );

  if (!visible) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-visible" aria-hidden="true">
      {pieces.map((piece) => (
        <span
          key={`${burstKey}-${piece.id}`}
          className="confetti-piece"
          style={{
            backgroundColor: piece.color,
            animationDelay: piece.delay,
            '--cx': piece.cx,
            '--cy': piece.cy,
            '--cr': piece.cr
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}
