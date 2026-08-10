import { Substance } from '../types';

export const SUBSTANCES: Substance[] = [
  // Эйфоретики
  { id: 'meph', name: 'Мефедрон', category: 'euphorics', aliases: ['меф', 'каф', 'мяу'], durationHours: 4, peakHours: 1, halfLifeHours: 2, color: '#e63946' },
  { id: 'mdma', name: 'MDMA', category: 'euphorics', aliases: ['мдма', 'экстази'], durationHours: 6, peakHours: 2, halfLifeHours: 8, color: '#e63946' },
  { id: 'ext', name: 'Экстази', category: 'euphorics', aliases: ['x', 'пилюли'], durationHours: 6, peakHours: 2, halfLifeHours: 8, color: '#e63946' },
  // Стимуляторы
  { id: 'meth', name: 'Метамфетамин', category: 'stimulants', aliases: ['мет', 'фен', 'витамин'], durationHours: 12, peakHours: 2, halfLifeHours: 10, color: '#fb8500' },
  { id: 'amp', name: 'Амфетамин', category: 'stimulants', aliases: ['амф', 'фен'], durationHours: 8, peakHours: 2, halfLifeHours: 12, color: '#fb8500' },
  { id: 'coc', name: 'Кокаин', category: 'stimulants', aliases: ['кокс', 'снежок'], durationHours: 1.5, peakHours: 0.5, halfLifeHours: 1, color: '#fb8500' },
  { id: 'apvp', name: 'a-PVP', category: 'stimulants', aliases: ['флака', 'pvp'], durationHours: 4, peakHours: 1, halfLifeHours: 2, color: '#fb8500' },
  { id: 'crack', name: 'Крэк', category: 'stimulants', aliases: [], durationHours: 0.5, peakHours: 0.2, halfLifeHours: 0.5, color: '#fb8500' },
  { id: 'mdfa', name: 'MDFA', category: 'stimulants', aliases: ['мдфа'], durationHours: 6, peakHours: 1.5, color: '#fb8500' },
  { id: '4cmc', name: '4-CMC', category: 'stimulants', aliases: ['4-cmc', 'клефедрон'], durationHours: 4, peakHours: 1, color: '#fb8500' },
  // Каннабиноиды
  { id: 'weed', name: 'Марихуана', category: 'cannabinoids', aliases: ['травка', 'шмаль', 'ганжа'], durationHours: 4, peakHours: 1, halfLifeHours: 20, color: '#2a9d8f' },
  { id: 'hash', name: 'Гашиш', category: 'cannabinoids', aliases: ['хэш'], durationHours: 6, peakHours: 1.5, halfLifeHours: 24, color: '#2a9d8f' },
  { id: 'buds', name: 'Бошки', category: 'cannabinoids', aliases: ['топ', 'плюхи'], durationHours: 4, peakHours: 1, halfLifeHours: 20, color: '#2a9d8f' },
  { id: 'vape', name: 'Вейп (каннаб.)', category: 'cannabinoids', aliases: [], durationHours: 2, peakHours: 0.5, halfLifeHours: 10, color: '#2a9d8f' },
  { id: 'edible', name: 'Эдиблы', category: 'cannabinoids', aliases: ['куки', 'печеньки'], durationHours: 8, peakHours: 3, halfLifeHours: 24, color: '#2a9d8f' },
  { id: 'syn', name: 'Синтетика', category: 'cannabinoids', aliases: ['спайс', 'k2'], durationHours: 3, peakHours: 1, halfLifeHours: 6, color: '#2a9d8f' },
  // Диссоциативы
  { id: 'ket', name: 'Кетамин', category: 'dissociatives', aliases: ['кет', 'к'], durationHours: 2, peakHours: 0.5, halfLifeHours: 3, color: '#9b5de5' },
  { id: 'mxe', name: 'MXE', category: 'dissociatives', aliases: [], durationHours: 4, peakHours: 1.5, halfLifeHours: 4, color: '#9b5de5' },
  { id: 'ghb', name: 'GHB', category: 'dissociatives', aliases: ['г', 'жидкий экстази'], durationHours: 3, peakHours: 0.5, halfLifeHours: 1, color: '#9b5de5' },
  { id: 'n2o', name: 'Закись азота', category: 'dissociatives', aliases: ['веселящий газ', 'н2о', 'n2o'], durationHours: 0.1, peakHours: 0.05, color: '#9b5de5' },
  // Бензодиазепины
  { id: 'xan', name: 'Ксанакс', category: 'benzodiazepines', aliases: ['ксан', 'xan'], durationHours: 6, peakHours: 1, halfLifeHours: 11, color: '#457b9d' },
  { id: 'val', name: 'Валиум', category: 'benzodiazepines', aliases: ['диазепам'], durationHours: 8, peakHours: 1.5, halfLifeHours: 48, color: '#457b9d' },
  { id: 'phen', name: 'Феназепам', category: 'benzodiazepines', aliases: ['феназ'], durationHours: 12, peakHours: 2, halfLifeHours: 18, color: '#457b9d' },
  { id: 'clon', name: 'Клоназепам', category: 'benzodiazepines', aliases: ['клон'], durationHours: 12, peakHours: 2, halfLifeHours: 34, color: '#457b9d' },
  { id: 'lor', name: 'Лоразепам', category: 'benzodiazepines', aliases: ['лора'], durationHours: 8, peakHours: 1.5, halfLifeHours: 14, color: '#457b9d' },
  { id: 'mid', name: 'Мидазолам', category: 'benzodiazepines', aliases: ['мида'], durationHours: 2, peakHours: 0.5, halfLifeHours: 2, color: '#457b9d' },
  // Опиоиды
  { id: 'her', name: 'Героин', category: 'opioids', aliases: ['гера', 'доза', 'хмур'], durationHours: 4, peakHours: 1, halfLifeHours: 0.5, color: '#e63946' },
  { id: 'metad', name: 'Метадон', category: 'opioids', aliases: [], durationHours: 24, peakHours: 4, halfLifeHours: 24, color: '#e63946' },
  { id: 'sub', name: 'Бупренорфин', category: 'opioids', aliases: ['суб', 'субутекс'], durationHours: 8, peakHours: 2, halfLifeHours: 37, color: '#e63946' },
  { id: 'fent', name: 'Фентанил', category: 'opioids', aliases: ['фент'], durationHours: 1, peakHours: 0.2, halfLifeHours: 4, color: '#e63946' },
  { id: 'tram', name: 'Трамадол', category: 'opioids', aliases: ['трам'], durationHours: 6, peakHours: 2, halfLifeHours: 6, color: '#e63946' },
  { id: 'cod', name: 'Кодеин', category: 'opioids', aliases: ['кодеин'], durationHours: 4, peakHours: 1.5, halfLifeHours: 3, color: '#e63946' },
  // Аптечные препараты (pharmacy) — не вписываются в бензы/опиоиды, но встречаются в аптечке
  { id: 'preg', name: 'Прегабалин', category: 'pharmacy', aliases: ['лирика', 'прег'], durationHours: 8, peakHours: 1, halfLifeHours: 6, color: '#6c757d' },
  { id: 'gab', name: 'Габапентин', category: 'pharmacy', aliases: ['габа'], durationHours: 6, peakHours: 2, halfLifeHours: 6, color: '#6c757d' },
  { id: 'zopc', name: 'Зопиклон', category: 'pharmacy', aliases: ['зоп'], durationHours: 6, peakHours: 1, halfLifeHours: 5, color: '#6c757d' },
  { id: 'trop', name: 'Тропикамид', category: 'pharmacy', aliases: ['тропик'], durationHours: 6, peakHours: 1.5, color: '#6c757d' },
  { id: 'dxm', name: 'Декстрометорфан', category: 'pharmacy', aliases: ['дхм', 'dxm'], durationHours: 6, peakHours: 1.5, halfLifeHours: 8, color: '#6c757d' },
  // Алкоголь
  { id: 'alc', name: 'Алкоголь', category: 'alcohol', aliases: ['бухло', 'пиво', 'водка'], durationHours: 6, peakHours: 1, halfLifeHours: 4, color: '#e9c46a' },
];

export const CATEGORY_LABELS: Record<string, string> = {
  euphorics: 'Эйфоретики',
  stimulants: 'Стимуляторы',
  cannabinoids: 'Каннабиноиды',
  dissociatives: 'Диссоциативы',
  benzodiazepines: 'Бензодиазепины',
  opioids: 'Опиоиды',
  pharmacy: 'Аптечные препараты',
  alcohol: 'Алкоголь',
  custom: 'Свой вариант'
};

export const CATEGORY_ORDER: string[] = [
  'euphorics', 'stimulants', 'cannabinoids', 'dissociatives',
  'benzodiazepines', 'pharmacy', 'opioids', 'alcohol', 'custom'
];
