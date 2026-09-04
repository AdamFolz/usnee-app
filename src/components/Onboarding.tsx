import { useState } from 'react';
import { ChevronRight, SkipForward, Shield, Zap, Lock, Eye, Check, Sparkles } from 'lucide-react';

interface OnboardingProps {
  onDone: () => void;
}

const slides = [
  {
    icon: Eye,
    title: 'USNEE. Без морали.',
    text: 'Просто дневник. Записываешь, что было — и сам видишь картину. Никто не ставит оценки.'
  },
  {
    icon: Zap,
    title: 'Запись за один экран',
    text: 'Все поля на одном экране: вещество, способ, доза, причина, компания. Заполни минимум — остальное можно не заполнять. Запись сохраняется локально даже без сети.'
  },
  {
    icon: Shield,
    title: 'Безопасность',
    text: 'NORS-таймер, признаки опасного состояния и экстренные контакты. Это справочные инструменты, а не замена медицинской помощи.'
  },
  {
    icon: Lock,
    title: 'Приватность',
    text: 'Данные сначала на этом телефоне. PIN помогает ограничить доступ к приложению. Содержимое записей никогда не покидает устройство — наружу уходит только обезличенная статистика использования (например, «запись создана»), без названий, доз и заметок.'
  }
];

export default function Onboarding({ onDone }: OnboardingProps) {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState<'left' | 'right'>('right');

  const goNext = () => {
    if (current < slides.length - 1) {
      setDirection('right');
      setCurrent(c => c + 1);
    }
  };

  const goPrev = () => {
    if (current > 0) {
      setDirection('left');
      setCurrent(c => c - 1);
    }
  };

  const SlideIcon = slides[current].icon;
  const progress = ((current + 1) / slides.length) * 100;

  return (
    <div className="flex h-full flex-col bg-usnee-bg">
      {/* Skip button */}
      <div className="flex items-center justify-between gap-4 p-4">
        <div className="flex items-center gap-2 text-caption uppercase tracking-[.12em] text-usnee-text3"><Sparkles className="h-3.5 w-3.5 text-usnee-accent" /> С чего начать</div>
        <button
          type="button"
          aria-label="Пропустить знакомство"
          onClick={onDone}
          className="flex items-center gap-1 text-sm text-usnee-text2 transition-colors hover:text-usnee-text active:scale-95"
        >
          <SkipForward className="h-4 w-4" />
          Пропустить
        </button>
      </div>

      <div className="px-6"><div className="h-1.5 overflow-hidden rounded-full bg-usnee-surface2"><div className="h-full rounded-full bg-usnee-accent transition-[width] duration-500" style={{ width: `${progress}%` }} /></div></div>

      {/* Slide content with directional transition */}
      <div className="relative flex-1 overflow-hidden px-6">
        <div
          key={current}
          className={`flex h-full flex-col items-center justify-center gap-6 ${
            direction === 'right' ? 'animate-slide-in-right' : 'animate-slide-in-left'
          }`}
        >
          <div className="relative flex h-24 w-24 items-center justify-center rounded-[2rem] bg-usnee-brand shadow-hero animate-float">
            <SlideIcon className="h-10 w-10 text-usnee-accent" />
            <div className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full border-4 border-usnee-bg bg-usnee-success"><Check className="h-3.5 w-3.5 text-usnee-bg" /></div>
          </div>
          <h2 className="text-center text-2xl font-bold text-usnee-text">
            {slides[current].title}
          </h2>
          <p className="text-center text-base leading-relaxed text-usnee-text2">
            {slides[current].text}
          </p>
        </div>
      </div>

      {/* Dots */}
      <div className="flex justify-center gap-2 py-6">
        {slides.map((_, i) => (
          <button
            type="button"
            aria-label={`Шаг ${i + 1} из ${slides.length}${i === current ? ', текущий' : ''}`}
            aria-current={i === current ? 'step' : undefined}
            key={i}
            onClick={() => {
              setDirection(i > current ? 'right' : 'left');
              setCurrent(i);
            }}
            className={`h-2 rounded-full transition-all ${
              i === current ? 'w-8 bg-usnee-accent' : 'w-2 bg-usnee-border'
            }`}
          />
        ))}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-4 px-6 pb-8">
        <button
          type="button"
          onClick={goPrev}
          disabled={current === 0}
          className="min-h-[48px] rounded-xl px-4 text-sm font-medium text-usnee-text2 transition-all active:scale-95 disabled:opacity-0"
        >
          Назад
        </button>

        {current === slides.length - 1 ? (
          <button
            onClick={onDone}
            className="big-tap flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl bg-usnee-accent font-semibold text-white transition-all active:scale-95"
          >
            Начать
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={goNext}
            className="big-tap flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl bg-usnee-surface font-semibold text-usnee-text transition-all active:scale-95"
          >
            Далее
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
export { Onboarding };
