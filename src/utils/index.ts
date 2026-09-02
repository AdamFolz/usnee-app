export { createUuid, id } from './ids';
export { pluralizeRu, formatCountRu, RECORD_FORMS, SLEEP_FORMS } from './pluralize';
export { formatDate } from './date';

type ClassValue = string | number | boolean | null | undefined | ClassList | ClassDict;

interface ClassDict {
  [key: string]: boolean;
}

type ClassList = Array<ClassValue>;

export function cn(...inputs: ClassValue[]): string {
  return inputs
    .flat()
    .filter((input) => input !== false && input !== null && input !== undefined)
    .join(' ');
}