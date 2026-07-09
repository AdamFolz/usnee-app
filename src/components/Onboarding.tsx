import { useState } from 'react';
import { ChevronRight, SkipForward, Shield, Zap, Lock, Eye } from 'lucide-react';

interface OnboardingProps {
  onDone: () => void;
}

const slides = [
  {
    icon: Eye,
    title: 'USNEE. Без осуждения, только факты.',
    text: 'Приложение для тех, кто предпочитает информированность самообману. Записывай, отслеживай, оставайся в живых. Никакого морализаторства — только данные и здравый смысл.'
  },
  {
    icon: Zap,
    title: 'Быстрая запись',
    text: 'Три тапа — и употребление зафиксировано. Потому что когда надо, никто не хочет возиться с формами. Мы уважаем твоё время (и твоё состояние).'
  },
  {
    icon: Shield,
    title: 'Безопасность',
    text: 'NORS-сессии, таймеры, напоминания о перерывах и воде. Налоксон рядом? Отметь. Проверил на фентанил? Запиши. Информация спасает жизни — твою в том числе.'
  },
  {
    icon: Lock,
    title: 'Приватность',
    text: 'Все данные хранятся локально на твоём устройстве. PIN-код, паник-кнопка для мгновенного выхода и полное отсутствие облаков. Твои дела — только твои дела.'
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

  return (
    <div className="flex h-full flex-col bg-usnee-bg">
      {/* Skip button */}
      <div className="flex justify-end p-4">
        <button
          onClick={onDone}
          className="flex items-center gap-1 text-sm text-usnee-text2 transition-colors hover:text-usnee-text active:scale-95"
        >
          <SkipForward className="h-4 w-4" />
          Пропустить
        </button>
      </div>

      {/* Slide content with simple transition */}
      <div className="relative flex-1 overflow-hidden px-6">
        <div
          key={current}
          className={`flex h-full flex-col items-center justify-center gap-6 ${
            direction === 'right' ? 'animate-slide-up' : 'animate-slide-up'
          }`}
        >
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-usnee-surface">
            <SlideIcon className="h-10 w-10 text-usnee-accent" />
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
