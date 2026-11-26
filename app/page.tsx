'use client';

import { useState } from 'react';
import { SwipeCard } from '../src/components/swipe-card/SwipeCard';
import type { QuestionCard, SwipeDir } from '../src/components/swipe-card/types';

const DEMO: QuestionCard[] = [
  {
    id: '1',
    text: 'Что для тебя важнее всего в отношениях?',
    category: 'Близость',
    gradient: 'linear-gradient(135deg, #5B3A8C, #2A1E5C)',
    hint: 'Подумай про доверие и поддержку.',
  },
  {
    id: '2',
    text: 'Как ты обычно справляешься со стрессом?',
    category: 'Забота',
    gradient: 'linear-gradient(135deg, #2E6B5A, #123A2F)',
  },
  {
    id: '3',
    text: 'О чём ты мечтаешь через 5 лет?',
    category: 'Будущее',
    gradient: 'linear-gradient(135deg, #8C5B3A, #4A2A18)',
  },
];

export default function Home() {
  const [cards, setCards] = useState(DEMO);
  const [lastSwipe, setLastSwipe] = useState<string | null>(null);

  const handleSwipe = (dir: SwipeDir, card: QuestionCard) => {
    setLastSwipe(`${dir}: ${card.text}`);
    setCards((prev) => prev.slice(1));
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-neutral-900 p-6 text-white">
      <div className="relative h-[420px] w-full max-w-sm">
        {cards.length === 0 ? (
          <p className="text-center text-lg">Карточки закончились 🎉</p>
        ) : (
          cards
            .slice(0, 3)
            .map((card, i) => (
              <SwipeCard
                key={card.id}
                card={card}
                isTop={i === 0}
                depth={i}
                onSwipe={handleSwipe}
                onTap={(c) => alert(c.hint ?? 'Подсказок нет')}
              />
            ))
            .reverse()
        )}
      </div>
      {lastSwipe && <p className="text-sm text-white/60">{lastSwipe}</p>}
    </main>
  );
}
