import { describe, expect, it } from 'vitest';
import { CATEGORY_LABELS, CATEGORY_ORDER, SUBSTANCES } from './substances';

describe('substances catalog', () => {
  it('keeps unique ids across all entries', () => {
    const ids = SUBSTANCES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every substance has a known category', () => {
    const known = new Set(Object.keys(CATEGORY_LABELS));
    const unknown = SUBSTANCES.map((s) => s.category).filter((c) => !known.has(c));
    expect(unknown).toEqual([]);
  });

  it('every category referenced in data is in CATEGORY_ORDER', () => {
    const ordered = new Set(CATEGORY_ORDER);
    const used = new Set(SUBSTANCES.map((s) => s.category));
    const missing = [...used].filter((c) => !ordered.has(c));
    expect(missing).toEqual([]);
  });

  it('every substance has a non-empty color', () => {
    const broken = SUBSTANCES.filter((s) => !s.color || !/^#[0-9a-fA-F]{6}$/.test(s.color));
    expect(broken).toEqual([]);
  });

  it('includes the recently added pharmacy-class substance Pregabalin', () => {
    const preg = SUBSTANCES.find((s) => s.id === 'preg');
    expect(preg).toBeDefined();
    expect(preg?.category).toBe('pharmacy');
    expect(CATEGORY_LABELS.pharmacy).toBe('Аптечные препараты');
  });

  it('keeps existing entries that were already in the catalog', () => {
    // Regression guard: prior catalog names must still be present.
    for (const id of ['meph', 'mdma', 'meth', 'her', 'fent', 'alc', 'ket']) {
      expect(SUBSTANCES.find((s) => s.id === id), `lost ${id}`).toBeDefined();
    }
  });
});
