'use client';

import { forwardRef, useId, useImperativeHandle } from 'react';
import { motion } from 'framer-motion';
import { STACK_OFFSET_PX, STACK_SCALE_STEP, SWIPE_DIRS } from './constants';
import { useSwipeCard } from './useSwipeCard';
import type { QuestionCard, SwipeCardHandle, SwipeDir } from './types';

export interface SwipeCardProps {
  /** Карточка, которую показываем. */
  card: QuestionCard;
  /** Только верхняя карточка стопки реагирует на жесты и клавиши. По умолчанию true. */
  isTop?: boolean;
  /** Глубина в стопке: 0 — верхняя, 1 и 2 — под ней. Сдвигает и уменьшает карточку. */
  depth?: number;
  /** Вызывается один раз, когда карточка улетела за экран. */
  onSwipe: (dir: SwipeDir, card: QuestionCard) => void;
  /** Тап, Enter или Space на карточке: открыть подсказки. */
  onTap?: (card: QuestionCard) => void;
}

// Мягкие цвета, без красного даже для «пропустим».
const STAMPS: Record<SwipeDir, { label: string; bg: string; fg: string; pos: string }> = {
  right: { label: 'Обсудим вместе', bg: '#BFEBD9', fg: '#0F3D2E', pos: 'top-6 left-6 -rotate-6' },
  left: { label: 'Пока пропустим', bg: '#EFE6DA', fg: '#3B3228', pos: 'top-6 right-6 rotate-6' },
  up: { label: 'В личное', bg: '#D9CCFF', fg: '#2A1E5C', pos: 'bottom-24 left-1/2 -translate-x-1/2' },
  down: { label: 'На потом', bg: '#FFD9C2', fg: '#4A2A18', pos: 'top-6 left-1/2 -translate-x-1/2' },
};

export const SwipeCard = forwardRef<SwipeCardHandle, SwipeCardProps>(function SwipeCard(
  { card, isTop = true, depth = 0, onSwipe, onTap },
  ref,
) {
  const helpId = useId();
  const { motionStyle, stamps, gestureProps, motionProps, swipe, cancel } = useSwipeCard({
    card,
    isTop,
    onSwipe: (result) => onSwipe(result.dir, result.card),
    onTap,
  });

  useImperativeHandle(ref, () => ({ swipe, cancel }), [swipe, cancel]);

  return (
    // Внешний слой держит позицию в стопке и жесты, внутренний движется за пальцем.
    <div
      {...gestureProps}
      className="absolute inset-0 touch-none transition-transform duration-300 ease-out motion-reduce:transition-none"
      style={{
        transform: `translateY(${depth * STACK_OFFSET_PX}px) scale(${1 - depth * STACK_SCALE_STEP})`,
        pointerEvents: isTop ? 'auto' : 'none',
        zIndex: 10 - depth,
      }}
      aria-hidden={isTop ? undefined : true}
    >
      <motion.div
        {...motionProps}
        role="group"
        aria-roledescription="карточка"
        aria-label={`${card.category}. ${card.text}`}
        aria-describedby={isTop ? helpId : undefined}
        tabIndex={isTop ? 0 : -1}
        style={{ ...motionStyle, background: card.gradient }}
        className="relative flex h-full cursor-grab select-none flex-col justify-between
                   rounded-[28px] p-7 text-white shadow-[0_20px_50px_-20px_rgba(40,20,60,0.55)]
                   active:cursor-grabbing
                   focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/70"
      >
        <span className="w-fit rounded-full bg-white/15 px-3 py-1 text-sm font-medium backdrop-blur">
          {card.category}
        </span>

        <p className="text-balance text-[28px] font-semibold leading-snug">{card.text}</p>

        <span className="min-h-5 text-sm text-white/80">
          {card.hint ? 'Нажми, чтобы открыть подсказки' : null}
        </span>

        {isTop &&
          SWIPE_DIRS.map((dir) => {
            const stamp = STAMPS[dir];
            return (
              <motion.span
                key={dir}
                aria-hidden
                style={{ opacity: stamps[dir], background: stamp.bg, color: stamp.fg }}
                className={`pointer-events-none absolute rounded-2xl px-4 py-2 text-base font-semibold ${stamp.pos}`}
              >
                {stamp.label}
              </motion.span>
            );
          })}
      </motion.div>

      {/* hidden: не читается в обычном режиме, но подхватывается aria-describedby */}
      <span id={helpId} hidden>
        Стрелка вправо — обсудим вместе, влево — пропустить, вверх — в личное, вниз — на потом.
        Enter — открыть подсказки. Escape — отменить.
      </span>
    </div>
  );
});
