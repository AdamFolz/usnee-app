/** Russian pluralization: 1 запись, 2 записи, 5 записей. */
export function pluralizeRu(count: number, forms: [string, string, string]): string {
  const n = Math.abs(Math.trunc(count)) % 100;
  const n1 = n % 10;
  if (n > 10 && n < 20) return forms[2];
  if (n1 === 1) return forms[0];
  if (n1 >= 2 && n1 <= 4) return forms[1];
  return forms[2];
}

export function formatCountRu(count: number, forms: [string, string, string]): string {
  return `${count} ${pluralizeRu(count, forms)}`;
}

export const RECORD_FORMS: [string, string, string] = ['запись', 'записи', 'записей'];
export const SLEEP_FORMS: [string, string, string] = ['сон', 'сна', 'снов'];
