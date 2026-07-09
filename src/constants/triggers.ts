import { Trigger } from '../types';

export const TRIGGERS: Trigger[] = [
  { id: 'stress', name: 'Стресс', icon: 'Zap' },
  { id: 'boredom', name: 'Скука', icon: 'Clock' },
  { id: 'social', name: 'Компания', icon: 'Users' },
  { id: 'pain', name: 'Боль / недосып', icon: 'Activity' },
  { id: 'celebration', name: 'Праздник', icon: 'PartyPopper' },
  { id: 'withdrawal', name: 'Ломка', icon: 'Flame' },
  { id: 'test', name: 'Проверка качества', icon: 'TestTube' },
  { id: 'habit', name: 'Привычка', icon: 'RotateCcw' },
  { id: 'curiosity', name: 'Любопытство', icon: 'Search' },
  { id: 'custom', name: 'Свой вариант', icon: 'PenTool' }
];

export const ACHIEVEMENTS = [
  { id: 'first', name: 'Первый раз', description: 'Сделал первую запись. Добро пожаловать в клуб.', condition: 'entries >= 1' },
  { id: 'night_owl', name: 'Ночная сова', description: 'Записал употребление в 3 ночи. Сон — для слабаков.', condition: 'entry_at_3am' },
  { id: 'lone_wolf', name: 'Одинокий волк', description: '69% фатальных случаев — в одиночку. Ты в рискованной категории.', condition: 'alone_entry' },
  { id: 'chemist', name: 'Самый химик', description: 'Попробовал 5 разных веществ. Курорт.', condition: 'unique_substances >= 5' },
  { id: 'pulse_racer', name: 'Гонщик пульса', description: 'Пульс 140+ после стимуляторов. Сердце — чемпион.', condition: 'pulse >= 140' },
  { id: 'fentanyl_slayer', name: 'Убийца фентанила', description: 'Протестировал на фентанил — отрицательно. Живём ещё один день.', condition: 'fentanyl_negative' },
  { id: 'missed_shot', name: 'Художник', description: 'Промахнулся в вену. Красивый синяк обеспечен.', condition: 'missed_shot' },
  { id: 'week_bender', name: 'Недельный запой', description: '7 дней подряд. Ты — легенда. Или нет.', condition: 'streak >= 7' },
  { id: 'clean_7', name: 'Семь дней чистоты', description: 'Неделя без употребления. Толерантность падает, осторожнее.', condition: 'clean_streak >= 7' },
  { id: 'hydrated', name: 'Гидратация', description: 'Выпил воды после 3 записей подряд. Молодец, хоть что-то делаешь правильно.', condition: 'water_3_entries' }
];
