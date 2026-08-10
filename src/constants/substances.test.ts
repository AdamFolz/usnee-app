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

  it('includes the classic psychedelics added in the second catalog pass', () => {
    for (const id of ['lsd', 'psilocybin', 'dmt', 'mescaline', '2cb', '25inbome', 'doi', 'ayahuasca']) {
      const s = SUBSTANCES.find((x) => x.id === id);
      expect(s, `lost ${id}`).toBeDefined();
      expect(s?.category).toBe('psychedelics');
    }
    expect(CATEGORY_LABELS.psychedelics).toBe('Психоделики');
  });

  it('keeps Salvia and BDO classified as dissociatives (not psychedelics)', () => {
    expect(SUBSTANCES.find((s) => s.id === 'salvia')?.category).toBe('dissociatives');
    expect(SUBSTANCES.find((s) => s.id === 'bdo')?.category).toBe('dissociatives');
  });

  it('keeps existing entries that were already in the catalog', () => {
    // Regression guard: prior catalog names must still be present.
    for (const id of ['meph', 'mdma', 'meth', 'her', 'fent', 'alc', 'ket']) {
      expect(SUBSTANCES.find((s) => s.id === id), `lost ${id}`).toBeDefined();
    }
  });
});
