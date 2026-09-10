import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SUBSTANCES } from '../../constants/substances';
import { SubstancePicker } from './SubstancePicker';

function renderPicker(overrides: Partial<Parameters<typeof SubstancePicker>[0]> = {}) {
  const props = {
    substances: SUBSTANCES,
    selectedId: null as string | null,
    onSelect: vi.fn(),
    query: '',
    onQueryChange: vi.fn(),
    ...overrides
  };
  render(<SubstancePicker {...props} />);
  return props;
}

beforeEach(() => vi.clearAllMocks());

describe('SubstancePicker', () => {
  it('renders category groups with names from the passed array', () => {
    renderPicker();
    expect(screen.getByRole('region', { name: 'Эйфоретики' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Стимуляторы' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Каннабиноиды' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Опиоиды' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Алкоголь' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Мефедрон/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Кокаин/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Героин/ })).toBeInTheDocument();
  });

  it('shows the alias dimmed next to the name', () => {
    renderPicker();
    const row = screen.getByRole('option', { name: /Мефедрон/ });
    expect(within(row).getByText('меф, каф, мяу')).toBeInTheDocument();
  });

  it('filters by alias', () => {
    renderPicker({ query: 'меф' });
    expect(screen.getByRole('option', { name: /Мефедрон/ })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /MDMA/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Героин/ })).not.toBeInTheDocument();
  });

  it('reports typed text to onQueryChange', () => {
    const props = renderPicker();
    fireEvent.change(screen.getByLabelText('Поиск вещества'), { target: { value: 'меф' } });
    expect(props.onQueryChange).toHaveBeenCalledWith('меф');
  });

  it('calls onSelect with the substance id on tap', async () => {
    const props = renderPicker();
    await userEvent.click(screen.getByRole('option', { name: /Кокаин/ }));
    expect(props.onSelect).toHaveBeenCalledWith('coc');
  });

  it('marks the selected id with aria-selected', () => {
    renderPicker({ selectedId: 'mdma' });
    expect(screen.getByRole('option', { name: /MDMA/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('option', { name: /Мефедрон/ })).toHaveAttribute('aria-selected', 'false');
  });

  it('keeps the custom row last and opens a name input for it', async () => {
    const props = renderPicker({ selectedId: 'custom', customName: '', onCustomNameChange: vi.fn() });
    const options = screen.getAllByRole('option');
    expect(options[options.length - 1]).toHaveTextContent('Свой вариант');
    await userEvent.click(screen.getByRole('option', { name: 'Свой вариант' }));
    expect(props.onSelect).toHaveBeenCalledWith('custom');
    const input = screen.getByLabelText('Название');
    fireEvent.change(input, { target: { value: 'тест' } });
    expect(props.onCustomNameChange).toHaveBeenCalledWith('тест');
  });

  it('shows the name input only when custom is selected', () => {
    renderPicker({ selectedId: 'meph', customName: '', onCustomNameChange: vi.fn() });
    expect(screen.queryByLabelText('Название')).not.toBeInTheDocument();
  });
});
