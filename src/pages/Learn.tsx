import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, BookOpen, Check, ChevronDown, ChevronUp, LockKeyhole, Play, ShieldCheck, Sparkles, Zap } from 'lucide-react';
import { Button, Surface, TopBar } from '../components/ui';

const lessons = [
  {
    id: 'start',
    icon: Zap,
    eyebrow: '01 · БЫСТРЫЙ СТАРТ',
    title: 'Запись за минуту',
    text: 'Нажми «Новая запись», выбери только то, что знаешь. Остальные поля можно заполнить позже — приложение не требует идеальности.',
    steps: ['Открой «Новая запись»', 'Выбери вещество и способ', 'Сохрани — запись останется на устройстве']
  },
  {
    id: 'data',
    icon: LockKeyhole,
    eyebrow: '02 · ТВОИ ДАННЫЕ',
    title: 'Локально и без сети',
    text: 'USNEE работает offline-first: записи сначала живут на этом устройстве. Если синхронизация подключена, это будет явно показано.',
    steps: ['Сеть не нужна для записи', 'PIN включается в настройках', 'Экспорт можно зашифровать паролем']
  },
  {
    id: 'safety',
    icon: ShieldCheck,
    eyebrow: '03 · БЕЗОПАСНОСТЬ',
    title: 'Инструменты рядом',
    text: 'SOS, NORS-таймер и справка не заменяют экстренные службы. Они помогают быстро сориентироваться, когда это важно.',
    steps: ['Настрой контакт для SOS', 'Используй таймер наблюдения', 'При угрозе жизни звони в экстренные службы']
  },
  {
    id: 'progress',
    icon: Sparkles,
    eyebrow: '04 · ПРОГРЕСС',
    title: 'Смотри на динамику',
    text: 'Прогресс — не оценка и не соревнование. Это спокойный способ заметить сон, воду, самочувствие и дни без записей.',
    steps: ['Отмечай самочувствие', 'Проверяй недельный ритм', 'Выбирай один маленький шаг']
  }
] as const;

export default function Learn() {
  const navigate = useNavigate();
  const [active, setActive] = useState<string | null>('start');
  const [completed, setCompleted] = useState<string[]>([]);
  const [demo, setDemo] = useState(false);

  const toggleLesson = (id: string) => {
    setActive((value) => value === id ? null : id);
    setCompleted((value) => value.includes(id) ? value : [...value, id]);
  };

  return (
    <div className="space-y-5 pb-8">
      <TopBar title="Обучение" eyebrow="КАК УСТРОЕН USNEE" />
      <Surface variant="glass" className="relative overflow-hidden p-5">
        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-usnee-accent/20 blur-3xl" />
        <div className="relative flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-usnee-brand shadow-hero animate-float"><BookOpen className="h-7 w-7 text-white" /></div>
          <div><p className="text-label uppercase text-usnee-brand">USNEE 101</p><h1 className="mt-1 text-title-lg">Разберись за 2 минуты</h1><p className="mt-2 text-body-sm text-usnee-text2">Короткие интерактивные подсказки вместо длинной инструкции.</p></div>
        </div>
        <div className="mt-5 flex items-center gap-3"><div className="h-2 flex-1 overflow-hidden rounded-full bg-usnee-bg"><div className="h-full rounded-full bg-usnee-brand transition-[width] duration-500" style={{ width: `${(completed.length / lessons.length) * 100}%` }} /></div><span className="text-caption text-usnee-text2">{completed.length}/{lessons.length}</span></div>
      </Surface>

      <section className="space-y-3" aria-label="Уроки">
        {lessons.map((lesson) => {
          const Icon = lesson.icon;
          const isOpen = active === lesson.id;
          const isDone = completed.includes(lesson.id);
          return (
            <Surface key={lesson.id} className={`overflow-hidden transition-[border-color,background-color] duration-normal ${isOpen ? 'border-usnee-brand/50 bg-usnee-glass' : ''}`}>
              <button type="button" onClick={() => toggleLesson(lesson.id)} aria-expanded={isOpen} className="flex min-h-[76px] w-full items-center gap-3 p-4 text-left active:scale-[.99]">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${isDone ? 'bg-usnee-success/15 text-usnee-success' : 'bg-usnee-surface2 text-usnee-brand'}`}><Icon className="h-5 w-5" />{isDone && <Check className="absolute h-3 w-3 translate-x-4 -translate-y-4" />}</div>
                <div className="min-w-0 flex-1"><p className="text-caption uppercase text-usnee-text3">{lesson.eyebrow}</p><h2 className="mt-1 text-title-md">{lesson.title}</h2></div>
                {isOpen ? <ChevronUp className="h-5 w-5 text-usnee-text3" /> : <ChevronDown className="h-5 w-5 text-usnee-text3" />}
              </button>
              {isOpen && <div className="animate-slide-up border-t border-usnee-border px-4 pb-4 pt-3"><p className="text-body-sm text-usnee-text2">{lesson.text}</p><ol className="mt-4 space-y-2">{lesson.steps.map((step, stepIndex) => <li key={step} className="flex items-center gap-3 text-body-sm"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-usnee-brand/15 text-caption font-bold text-usnee-brand">{stepIndex + 1}</span>{step}</li>)}</ol>{lesson.id === 'start' && <Button variant="secondary" className="mt-4 w-full" onClick={() => navigate('/add')}>Попробовать запись <ArrowRight className="h-4 w-4" /></Button>}</div>}
            </Surface>
          );
        })}
      </section>

      <Surface className="p-4">
        <div className="flex items-start gap-3"><Play className="mt-0.5 h-5 w-5 shrink-0 text-usnee-accent" /><div><h2 className="text-title-md">Мини-демо</h2><p className="mt-1 text-body-sm text-usnee-text2">Нажми кнопку — увидишь, как приложение отвечает на действие.</p></div></div>
        <Button variant="primary" className="mt-4 w-full" onClick={() => setDemo((value) => !value)}>{demo ? 'Скрыть демо' : 'Запустить демо'} <ArrowRight className={`h-4 w-4 transition-transform duration-normal ${demo ? 'rotate-90' : ''}`} /></Button>
        {demo && <div className="animate-slide-up mt-3 rounded-xl border border-usnee-success/30 bg-usnee-success/10 p-3 text-body-sm text-usnee-success"><Check className="mr-2 inline h-4 w-4" />Готово. В USNEE любое действие должно давать понятный отклик.</div>}
      </Surface>
    </div>
  );
}
