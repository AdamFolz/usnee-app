import { ConsumptionMethod } from '../types';

// Per-route site options so we don't show "Вена локтя" for intramuscular
// injections. Each route gets a coherent list of anatomical zones.
const ROUTE_SITES: Record<string, string[]> = {
  'в/в (внутривенно)': ['Вена локтя', 'Вена кисти', 'Вена стопы', 'Другое'],
  'в/м (внутримышечно)': ['Бедро', 'Ягодица', 'Дельта (плечо)', 'Другое'],
  'п/к (подкожно)': ['Живот', 'Бедро', 'Рука', 'Другое']
};

export function getSiteOptionsForRoute(route: string | undefined): string[] | undefined {
  if (!route) return undefined;
  return ROUTE_SITES[route];
}

export function getRouteForSite(site: string | undefined): string | undefined {
  if (!site) return undefined;
  return Object.entries(ROUTE_SITES).find(([, sites]) => sites.includes(site))?.[0];
}

export const METHODS: ConsumptionMethod[] = [
  {
    id: 'inject',
    name: 'Инъекция',
    icon: 'Syringe',
    abbreviations: ['в/в', 'в/м', 'п/к'],
    fields: [
      { key: 'route', label: 'Способ', type: 'select', options: ['в/в (внутривенно)', 'в/м (внутримышечно)', 'п/к (подкожно)'], optional: false },
      { key: 'site', label: 'Место', type: 'select', options: ROUTE_SITES['в/в (внутривенно)'], optional: true, dependsOn: { key: 'route', map: ROUTE_SITES } },
      { key: 'volume', label: 'Объём', type: 'number', unit: 'мл', placeholder: '0.8', optional: false },
      { key: 'missed', label: 'Промах (missed shot)', type: 'boolean', optional: true }
    ]
  },
  {
    id: 'smoke',
    name: 'Курение',
    icon: 'Flame',
    abbreviations: [],
    fields: [
      { key: 'device', label: 'Устройство', type: 'select', options: ['Фольга', 'Трубка', 'Бонг', 'Вейп', 'Папиросная бумага', 'Другое'], optional: false },
      { key: 'dose', label: 'Доза', type: 'number', placeholder: '0.1', optional: false },
      { key: 'doseUnit', label: 'Единица', type: 'select', options: ['г', 'мг', 'хиты'], optional: false }
    ]
  },
  {
    id: 'oral',
    name: 'Перорально',
    icon: 'Pill',
    abbreviations: ['по'],
    fields: [
      { key: 'dose', label: 'Доза', type: 'number', placeholder: '1', optional: false },
      { key: 'doseUnit', label: 'Единица', type: 'select', options: ['мг', 'г', 'табл.', 'мл'], optional: false },
      { key: 'stomach', label: 'Желудок', type: 'select', options: ['Пустой', 'Полный', 'Лёгкий перекус'], optional: true }
    ]
  },
  {
    id: 'sniff',
    name: 'Нюхать',
    icon: 'Wind',
    abbreviations: [],
    fields: [
      { key: 'dose', label: 'Доза', type: 'number', placeholder: '0.05', optional: false },
      { key: 'doseUnit', label: 'Единица', type: 'select', options: ['г', 'мг', 'линии'], optional: false }
    ]
  }
];

export const METHOD_ABBREVIATIONS: Record<string, string> = {
  'в/в': 'Внутривенно',
  'в/м': 'Внутримышечно',
  'п/к': 'Подкожно',
  'по': 'Перорально (через рот)'
};
