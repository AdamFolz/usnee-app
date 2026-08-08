import { describe, expect, it } from 'vitest';
import { formatCountRu, pluralizeRu, RECORD_FORMS } from './pluralize';

describe('pluralizeRu', () => {
  it('handles запись forms', () => {
    expect(pluralizeRu(0, RECORD_FORMS)).toBe('записей');
    expect(pluralizeRu(1, RECORD_FORMS)).toBe('запись');
    expect(pluralizeRu(2, RECORD_FORMS)).toBe('записи');
    expect(pluralizeRu(3, RECORD_FORMS)).toBe('записи');
    expect(pluralizeRu(4, RECORD_FORMS)).toBe('записи');
    expect(pluralizeRu(5, RECORD_FORMS)).toBe('записей');
    expect(pluralizeRu(11, RECORD_FORMS)).toBe('записей');
    expect(pluralizeRu(21, RECORD_FORMS)).toBe('запись');
    expect(pluralizeRu(22, RECORD_FORMS)).toBe('записи');
    expect(pluralizeRu(25, RECORD_FORMS)).toBe('записей');
  });

  it('formats count with form', () => {
    expect(formatCountRu(1, RECORD_FORMS)).toBe('1 запись');
    expect(formatCountRu(2, RECORD_FORMS)).toBe('2 записи');
  });
});
