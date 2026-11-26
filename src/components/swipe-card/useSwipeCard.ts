'use client';

import { useCallback, useEffect, useRef } from 'react';
import type { KeyboardEvent } from 'react';
import {
  animate,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from 'framer-motion';
import type { MotionStyle, MotionValue } from 'framer-motion';
import { useDrag } from '@use-gesture/react';
import {
  DISTANCE,
  FLY_DISTANCE,
  FLY_SPRING,
  HOVER_LIFT,
  MIN_FLICK_DISTANCE,
  REDUCED_TWEEN,
  SPRING,
  VELOCITY,
  VERTICAL_BIAS,
} from './constants';
import type { QuestionCard, SwipeDir, SwipeResult } from './types';

type Vec = readonly [number, number];

/**
 * idle     — карточка покоится
 * dragging — идёт жест
 * leaving  — летит, onSwipe ещё не вызван (здесь возможна отмена)
 * done     — onSwipe вызван, откатывать уже нельзя
 */
type Phase = 'idle' | 'dragging' | 'leaving' | 'done';

const ARROW_TO_DIR: Readonly<Partial<Record<string, SwipeDir>>> = {
  ArrowRight: 'right',
  ArrowLeft: 'left',
  ArrowUp: 'up',
  ArrowDown: 'down',
};

/**
 * Чистая функция: по смещению и скорости решает, был ли это свайп.
 * Вынесена из хука, чтобы тестировать без DOM.
 */
export function resolveDir(movement: Vec, velocity: Vec): SwipeDir | null {
  const [mx, my] = movement;
  const [vx, vy] = velocity;

  const vertical = Math.abs(my) * VERTICAL_BIAS >= Math.abs(mx);
  const dist = vertical ? my : mx;
  // use-gesture v10 отдаёт модуль скорости; abs — страховка от смены версии.
  const speed = Math.abs(vertical ? vy : vx);

  const farEnough = Math.abs(dist) > DISTANCE;
  const flicked = speed > VELOCITY && Math.abs(dist) > MIN_FLICK_DISTANCE;
  if (!farEnough && !flicked) return null;

  if (vertical) return dist > 0 ? 'down' : 'up';
  return dist > 0 ? 'right' : 'left';
}

function vibrate(pattern: number | number[]): void {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  navigator.vibrate(pattern);
}

export interface UseSwipeCardOptions {
  /** Карточка, которой управляет хук. */
  card: QuestionCard;
  /** Только верхняя карточка стопки реагирует на жесты, клавиши и Escape. */
  isTop: boolean;
  /** Вызывается один раз, когда карточка улетела. */
  onSwipe: (result: SwipeResult) => void;
  /** Вызывается по тапу или Enter/Space на карточке. */
  onTap?: (card: QuestionCard) => void;
}

export function useSwipeCard({ card, isTop, onSwipe, onTap }: UseSwipeCardOptions) {
  const reducedMotion = useReducedMotion() ?? false;

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const lift = useMotionValue(0);

  const phase = useRef<Phase>('idle');
  const mounted = useRef(false);
  const armed = useRef(false);
  const gestureCancelled = useRef(false);
  const origin = useRef({ x: 0, y: 0 });

  // Свежие пропсы без пересоздания колбэков: swipe/cancel остаются стабильными.
  const latest = useRef({ card, isTop, onSwipe, onTap, reducedMotion });
  useEffect(() => {
    latest.current = { card, isTop, onSwipe, onTap, reducedMotion };
  });

  const buzz = useCallback((pattern: number | number[]) => {
    if (!latest.current.reducedMotion) vibrate(pattern);
  }, []);

  const springBack = useCallback(() => {
    const transition = latest.current.reducedMotion ? REDUCED_TWEEN : SPRING;
    animate(x, 0, transition);
    animate(y, 0, transition);
  }, [x, y]);

  const swipe = useCallback(
    (dir: SwipeDir) => {
      const current = phase.current;
      if (!latest.current.isTop || current === 'leaving' || current === 'done') return;

      const { card: swiped, reducedMotion: reduced } = latest.current;
      phase.current = 'leaving';
      buzz(dir === 'right' ? [12, 30, 12] : 10);

      const horizontal = dir === 'left' || dir === 'right';
      const forward = dir === 'right' || dir === 'down';
      animate(horizontal ? x : y, (forward ? 1 : -1) * FLY_DISTANCE, {
        ...(reduced ? REDUCED_TWEEN : FLY_SPRING),
        onComplete: () => {
          // Размонтирование или cancel() переводят карточку из 'leaving': onSwipe тогда не нужен.
          if (!mounted.current || phase.current !== 'leaving') return;
          phase.current = 'done';
          latest.current.onSwipe({ dir, card: swiped });
        },
      });
    },
    [x, y, buzz],
  );

  const cancel = useCallback(() => {
    const current = phase.current;
    if (current !== 'dragging' && current !== 'leaving') return;
    if (current === 'dragging') gestureCancelled.current = true;
    phase.current = 'idle';
    armed.current = false;
    x.stop();
    y.stop();
    springBack();
  }, [x, y, springBack]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      x.stop();
      y.stop();
      lift.stop();
    };
  }, [x, y, lift]);

  // Escape ловим на window: фокус может быть на внешней кнопке, которая запустила swipe().
  useEffect(() => {
    if (!isTop) return undefined;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') cancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isTop, cancel]);

  const bind = useDrag(
    ({ first, active, tap, movement: [mx, my], velocity }) => {
      const { isTop: top, card: current, onTap: handleTap } = latest.current;
      const state = phase.current;
      if (!top || state === 'leaving' || state === 'done') return;

      if (first) {
        gestureCancelled.current = false;
        armed.current = false;
        // Если карточку поймали посреди возврата, продолжаем с её текущего места.
        origin.current = { x: x.get(), y: y.get() };
        x.stop();
        y.stop();
        lift.stop();
        lift.set(0);
        phase.current = 'dragging';
      }
      if (gestureCancelled.current) return;

      if (tap) {
        phase.current = 'idle';
        handleTap?.(current);
        return;
      }

      if (active) {
        x.set(origin.current.x + mx);
        y.set(origin.current.y + my);
        const crossed = Math.max(Math.abs(mx), Math.abs(my)) > DISTANCE;
        if (crossed && !armed.current) buzz(8);
        armed.current = crossed;
        return;
      }

      armed.current = false;
      phase.current = 'idle';
      const dir = resolveDir([mx, my], velocity);
      if (dir) swipe(dir);
      else springBack();
    },
    { filterTaps: true },
  );

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLElement>) => {
      // Alt+← это «назад» в браузере; вложенные кнопки обрабатывают свои клавиши сами.
      if (!latest.current.isTop || e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.target !== e.currentTarget) return;

      const dir = ARROW_TO_DIR[e.key];
      if (dir) {
        e.preventDefault();
        swipe(dir);
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        latest.current.onTap?.(latest.current.card);
      }
    },
    [swipe],
  );

  // Подъём при наведении идёт через отдельное значение, а не whileHover:
  // whileHover анимировал бы тот же y, которым управляет перетаскивание.
  const onHoverStart = useCallback(() => {
    const { isTop: top, reducedMotion: reduced } = latest.current;
    if (!top || reduced || phase.current !== 'idle') return;
    animate(lift, HOVER_LIFT, SPRING);
  }, [lift]);

  const onHoverEnd = useCallback(() => {
    animate(lift, 0, SPRING);
  }, [lift]);

  const rotate = useTransform(x, [-220, 220], [-12, 12]);

  // Расстояние от центра для «растворения». Без деструктуризации: при
  // noUncheckedIndexedAccess элементы массива имеют тип number | undefined.
  const distance = useTransform([x, y], (v: number[]) => Math.hypot(v[0] ?? 0, v[1] ?? 0));
  const opacity = useTransform(distance, [150, 450], [1, 0]);
  const scale = useTransform(distance, [0, 450], [1, 0.92]);
  const yWithLift = useTransform([y, lift], (v: number[]) => (v[0] ?? 0) + (v[1] ?? 0));

  const stamps: Record<SwipeDir, MotionValue<number>> = {
    right: useTransform(x, [30, 120], [0, 1]),
    left: useTransform(x, [-120, -30], [1, 0]),
    up: useTransform(y, [-120, -30], [1, 0]),
    down: useTransform(y, [30, 120], [0, 1]),
  };

  const motionStyle: MotionStyle = {
    x,
    y: yWithLift,
    rotate: reducedMotion ? 0 : rotate,
    opacity: isTop ? opacity : 1,
    scale: isTop ? scale : 1,
  };

  return {
    motionStyle,
    stamps,
    /** Спредить на внешний обычный div: жесты не пересекаются с пропсами motion. */
    gestureProps: bind(),
    /** Спредить на motion-элемент карточки. */
    motionProps: { onKeyDown, onHoverStart, onHoverEnd },
    swipe,
    cancel,
  };
}
