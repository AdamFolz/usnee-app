import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { BottomNav } from './BottomNav';

vi.mock('../integrations/telegram', () => ({ hapticSelection: vi.fn() }));

function renderNav(route: string) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <BottomNav />
    </MemoryRouter>
  );
}

describe('BottomNav', () => {
  it('marks the active tab with aria-current=page', () => {
    renderNav('/history');
    expect(screen.getByRole('link', { name: 'История' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Главная' })).not.toHaveAttribute('aria-current');
  });

  it('marks home tab active only on the root route', () => {
    renderNav('/');
    expect(screen.getByRole('link', { name: 'Главная' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Прогресс' })).not.toHaveAttribute('aria-current');
  });
});
