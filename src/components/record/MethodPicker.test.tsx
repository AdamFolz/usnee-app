import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { METHODS } from '../../constants/methods';
import { MethodPicker } from './MethodPicker';

function renderPicker(overrides: Partial<Parameters<typeof MethodPicker>[0]> = {}) {
  const props = {
    methods: METHODS,
    selectedId: null as string | null,
    onSelect: vi.fn(),
    ...overrides
  };
  render(<MethodPicker {...props} />);
  return props;
}

beforeEach(() => vi.clearAllMocks());

describe('MethodPicker', () => {
  it('renders four tiles with an icon inside each', () => {
    renderPicker();
    const tiles = screen.getAllByRole('button');
    expect(tiles).toHaveLength(4);
    expect(screen.getByRole('button', { name: 'Инъекция' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Курение' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Перорально' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Нюхать' })).toBeInTheDocument();
    tiles.forEach((tile) => expect(tile.querySelector('svg')).not.toBeNull());
  });

  it('calls onSelect with the method id on tap', async () => {
    const props = renderPicker();
    await userEvent.click(screen.getByRole('button', { name: 'Курение' }));
    expect(props.onSelect).toHaveBeenCalledWith('smoke');
  });

  it('marks the selected method with aria-pressed', () => {
    renderPicker({ selectedId: 'inject' });
    expect(screen.getByRole('button', { name: 'Инъекция' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Нюхать' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('fills the selected tile with the accent color when given', () => {
    renderPicker({ selectedId: 'inject', accentColor: '#e63946' });
    const tile = screen.getByRole('button', { name: 'Инъекция' });
    expect(tile).toHaveStyle({ backgroundColor: '#e63946' });
  });
});
