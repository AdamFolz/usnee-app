import { ConsumptionMethod } from '../types';

export const METHODS: ConsumptionMethod[] = [
  {
    id: 'inject',
    name: 'Инъекция',
    icon: 'Syringe',
    abbreviations: ['в/в', 'в/м', 'п/к'],
    fields: [
      { key: 'route', label: 'Способ', type: 'select', options: ['в/в (внутривенно)', 'в/м (внутримышечно)', 'п/к (подкожно)'], optional: false },
      { key: 'site', label: 'Место', type: 'select', options: ['Вена локтя', 'Вена кисти', 'Бедро', 'Шея', 'Другое'], optional: true },
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
