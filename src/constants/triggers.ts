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
  { id: 'first', name: 'Первая запись', description: 'Первая запись сохранена на устройстве.', condition: 'entries >= 1' },
  { id: 'night_owl', name: 'Ночная запись', description: 'Есть запись около 3:00. Следите за сном и восстановлением.', condition: 'entry_at_3am' },
  { id: 'lone_wolf', name: 'Запись в одиночку', description: 'Отмечено употребление в одиночку. В рискованной ситуации лучше не оставаться одному.', condition: 'alone_entry' },
  { id: 'chemist', name: 'Несколько веществ', description: 'В истории есть 5 разных веществ.', condition: 'unique_substances >= 5' },
  { id: 'pulse_racer', name: 'Высокий пульс', description: 'Зафиксирован пульс 140+. При ухудшении самочувствия обращайтесь за помощью.', condition: 'pulse >= 140' },
  { id: 'fentanyl_slayer', name: 'Тест на фентанил', description: 'Отмечен отрицательный тест на фентанил.', condition: 'fentanyl_negative' },
  { id: 'missed_shot', name: 'Промах отмечен', description: 'Зафиксирован промах. Следите за местом инъекции и стерильностью.', condition: 'missed_shot' },
  { id: 'week_bender', name: 'Неделя подряд', description: 'Записи 7 дней подряд. Имеет смысл пересмотреть нагрузку и паузы.', condition: 'streak >= 7' },
  { id: 'clean_7', name: 'Семь дней без', description: 'Неделя без записей употребления. После паузы толерантность ниже — начинайте осторожнее.', condition: 'clean_streak >= 7' },
  { id: 'hydrated', name: 'Вода', description: 'Отмечено питьё воды при активных записях.', condition: 'water_3_entries' }
];
