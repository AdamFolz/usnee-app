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
  { id: 'hydrated', name: 'Вода', description: 'Отмечено питьё воды при активных записях.', condition: 'water_3_entries' },
  { id: 'still_alive', name: 'Ого, ты всё ещё живой', description: '5 инъекций за день. Респект организму.', condition: 'entries_24h >= 5' },
  { id: 'work_tomorrow', name: 'Надеюсь, завтра не на работу', description: '3 инъекции после полуночи. Босс будет рад.', condition: 'night_entries_24h >= 3' },
  { id: 'barely_breathing', name: 'Еле-еле, но иду', description: 'Интервал меньше часа. Ты точно в порядке?', condition: 'min_interval < 1h' },
  { id: 'to_infinity', name: 'Бесконечность не предел', description: '10 инъекций за сутки. Buzz Lightyear гордился бы.', condition: 'entries_24h >= 10' },
  { id: 'vampire', name: 'Ночная смена', description: 'Все инъекции с 00:00 до 06:00. Сон для слабых.', condition: 'all_entries_24h_00_06' },
  { id: 'speedrun', name: 'Спидраннер', description: '3 инъекции за час. Any% категория?', condition: 'entries_1h >= 3' },
  { id: 'marathon', name: 'Марафонец', description: '24 часа с инъекциями каждый час. Выносливость.', condition: 'hourly_run >= 24' },
  { id: 'collector', name: 'Коллекционер', description: '5 разных мест за день. Всё тело в деле.', condition: 'sites_24h >= 5' },
  { id: 'pharmacist', name: 'Аптечка-тоска', description: 'Закончили партию за 1 день. Скорость света.', condition: 'batch_empty_same_day' },
  { id: 'architect', name: 'Архитектор', description: 'Первый раз запланировали партию заранее. Мыслитель.', condition: 'batch_exists' },
  { id: 'diary', name: 'Писатель', description: 'Записали 3 заметки о триггерах. Самоанализ — это круто.', condition: 'notes_or_triggers >= 3' }
];
