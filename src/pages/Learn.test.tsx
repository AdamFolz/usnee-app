import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import Learn from './Learn';

function renderLearn() {
  return render(
    <MemoryRouter>
      <Learn />
    </MemoryRouter>
  );
}

describe('Learn', () => {
  it('renders the header and all four lessons with the first one open', () => {
    renderLearn();
    expect(screen.getByText('Разберись за 2 минуты')).toBeInTheDocument();
    expect(screen.getByText('01 · БЫСТРЫЙ СТАРТ')).toBeInTheDocument();
    expect(screen.getByText('02 · ТВОИ ДАННЫЕ')).toBeInTheDocument();
    expect(screen.getByText('03 · БЕЗОПАСНОСТЬ')).toBeInTheDocument();
    expect(screen.getByText('04 · ПРОГРЕСС')).toBeInTheDocument();
    expect(screen.getByText('Открой «Новая запись»')).toBeInTheDocument();
  });

  it('expands a lesson and shows its steps', async () => {
    renderLearn();
    expect(screen.queryByText('Сеть не нужна для записи')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /На этом телефоне/ }));
    expect(screen.getByText('Сеть не нужна для записи')).toBeInTheDocument();
    expect(screen.getByText('PIN включается в настройках')).toBeInTheDocument();
    expect(screen.getByText('Экспорт можно зашифровать паролем')).toBeInTheDocument();
  });

  it('collapses an open lesson on second click', async () => {
    renderLearn();
    await userEvent.click(screen.getByRole('button', { name: /С чего начать/ }));
    expect(screen.queryByText('Открой «Новая запись»')).not.toBeInTheDocument();
  });

  it('data lesson talks about the device and PIN, never about silent server sync', async () => {
    renderLearn();
    await userEvent.click(screen.getByRole('button', { name: /На этом телефоне/ }));
    expect(screen.getByText(/записи сначала живут на этом устройстве/)).toBeInTheDocument();
    expect(screen.queryByText(/на сервер/i)).not.toBeInTheDocument();
  });
});
