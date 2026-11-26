import type { SwipeDir } from './types';

/** Смещение (px) по главной оси, после которого свайп засчитывается. */
export const DISTANCE = 110;

/** Скорость (px/мс), при которой короткий бросок тоже считается свайпом. */
export const VELOCITY = 0.5;

/** Минимальное смещение (px) для броска: случайный рывок при касании свайпом не станет. */
export const MIN_FLICK_DISTANCE = 30;

/** Вертикаль выигрывает, пока |dy| × VERTICAL_BIAS ≥ |dx|. Жесты вверх и вниз неудобнее, им даём фору. */
export const VERTICAL_BIAS = 1.2;

/** Куда улетает карточка (px от центра). */
export const FLY_DISTANCE = 700;

/** Подъём карточки при наведении мыши (px, отрицательный = вверх). */
export const HOVER_LIFT = -4;

/** Сдвиг карточки в стопке на каждый уровень глубины (px). */
export const STACK_OFFSET_PX = 14;

/** Уменьшение масштаба на каждый уровень глубины. */
export const STACK_SCALE_STEP = 0.05;

/** Возврат на место и подъём при наведении. */
export const SPRING = { type: 'spring', stiffness: 380, damping: 32 } as const;

/** Вылет карточки. */
export const FLY_SPRING = { type: 'spring', stiffness: 220, damping: 28 } as const;

/** Замена пружин при prefers-reduced-motion: короткий твин без отскока. */
export const REDUCED_TWEEN = { type: 'tween', duration: 0.12, ease: 'easeOut' } as const;

export const SWIPE_DIRS: readonly SwipeDir[] = ['right', 'left', 'up', 'down'];
