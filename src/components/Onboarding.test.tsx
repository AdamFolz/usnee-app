import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import Onboarding from './Onboarding';

describe('Onboarding', () => {
  it('walks through all slides and reaches onDone', async () => {
    const onDone = vi.fn();
    render(<Onboarding onDone={onDone} />);
    expect(screen.getByText('USNEE. Без морали.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Далее/ }));
    expect(screen.getByText('Запись за один экран')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Далее/ }));
    await userEvent.click(screen.getByRole('button', { name: /Далее/ }));
    expect(screen.getByText('Приватность')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Начать/ }));
    expect(onDone).toHaveBeenCalledOnce();
  });

  it('skips straight to onDone', async () => {
    const onDone = vi.fn();
    render(<Onboarding onDone={onDone} />);
    await userEvent.click(screen.getByRole('button', { name: 'Пропустить знакомство' }));
    expect(onDone).toHaveBeenCalledOnce();
  });

  it('jumps back via step dots', async () => {
    const onDone = vi.fn();
    render(<Onboarding onDone={onDone} />);
    await userEvent.click(screen.getByRole('button', { name: /Далее/ }));
    expect(screen.getByText('Запись за один экран')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Шаг 1 из 4' }));
    expect(screen.getByText('USNEE. Без морали.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Назад' })).toBeDisabled();
  });
});
