import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  SAFETY_DISCLOSURE_RU,
  SAFETY_TIMER_DISCLOSURE_RU,
  SAFETY_CALL_UNVERIFIED_RU,
  SAFETY_DANGER_SIGNS_RU
} from '../../contracts/safety';
import { SosSheet } from './SosSheet';
import { EmergencyCallAction } from './EmergencyCallAction';
import { TrustedContactAction } from './TrustedContactAction';
import { EmergencyChecklist } from './EmergencyChecklist';
import { LocalCheckInTimer } from './LocalCheckInTimer';

const FORBIDDEN_CLAIMS = [
  'Помощь вызвана',
  'Скорая уже едет',
  'Контакт уведомлён',
  'Мы следим',
  'активируем экстренный протокол'
];

describe('EmergencyCallAction', () => {
  it('renders explicit tel link with default number and regional note', () => {
    render(<EmergencyCallAction />);
    const link = screen.getByRole('link', { name: /Позвонить в экстренную службу · 103/ });
    expect(link).toHaveAttribute('href', 'tel:103');
    expect(screen.getByText(/Убедитесь, что он действует в вашей стране/)).toBeInTheDocument();
  });

  it('uses a custom number and shows unverified-call notice after tap', async () => {
    render(<EmergencyCallAction number="112" />);
    const link = screen.getByRole('link', { name: /112/ });
    expect(link).toHaveAttribute('href', 'tel:112');
    expect(screen.queryByText(SAFETY_CALL_UNVERIFIED_RU)).not.toBeInTheDocument();
    await userEvent.click(link);
    expect(screen.getByText(SAFETY_CALL_UNVERIFIED_RU)).toBeInTheDocument();
  });
});

describe('TrustedContactAction', () => {
  it('renders nothing without a configured contact', () => {
    const { container } = render(<TrustedContactAction />);
    expect(container).toBeEmptyDOMElement();
    const { container: blank } = render(<TrustedContactAction contact="   " />);
    expect(blank).toBeEmptyDOMElement();
  });

  it('renders tel link for configured contact and honest notice after tap', async () => {
    render(<TrustedContactAction contact="+79990001122" />);
    const link = screen.getByRole('link', { name: /\+79990001122/ });
    expect(link).toHaveAttribute('href', 'tel:+79990001122');
    await userEvent.click(link);
    expect(screen.getByText(SAFETY_CALL_UNVERIFIED_RU)).toBeInTheDocument();
  });
});

describe('EmergencyChecklist', () => {
  it('renders the offline first-response steps', () => {
    render(<EmergencyChecklist />);
    expect(screen.getByText('Что делать прямо сейчас')).toBeInTheDocument();
    expect(screen.getByText(/Проверь реакцию/)).toBeInTheDocument();
    expect(screen.getByText(/Проверь дыхание/)).toBeInTheDocument();
    expect(screen.getByText(/Не оставляй человека одного/)).toBeInTheDocument();
  });
});

describe('LocalCheckInTimer', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('always shows the honest timer disclosure', () => {
    render(<LocalCheckInTimer />);
    expect(screen.getByText(SAFETY_TIMER_DISCLOSURE_RU)).toBeInTheDocument();
  });

  it('starts, counts down, goes overdue with danger notice, and resets on check-in', async () => {
    render(<LocalCheckInTimer />);

    fireEvent.click(screen.getByRole('button', { name: '10 мин' }));
    fireEvent.click(screen.getByRole('button', { name: 'Запустить таймер' }));
    expect(screen.getByText(/До проверки/)).toBeInTheDocument();
    expect(screen.getByText('Идёт')).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10 * 60_000 + 1000);
    });
    expect(screen.getByText('Проверка пропущена')).toBeInTheDocument();
    expect(screen.getByText(SAFETY_DANGER_SIGNS_RU)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Я в порядке' }));
    expect(screen.getByText(/До проверки/)).toBeInTheDocument();
    expect(screen.queryByText('Проверка пропущена')).not.toBeInTheDocument();
  });

  it('stops the session', () => {
    render(<LocalCheckInTimer />);
    fireEvent.click(screen.getByRole('button', { name: 'Запустить таймер' }));
    fireEvent.click(screen.getByRole('button', { name: 'Остановить' }));
    expect(screen.getByRole('button', { name: 'Запустить таймер' })).toBeInTheDocument();
  });
});

describe('SosSheet', () => {
  it('shows disclosure, call action, checklist, timer and safety hub link', () => {
    render(<SosSheet open onClose={() => {}} onOpenSafetyHub={() => {}} />);
    expect(screen.getByRole('dialog', { name: 'SOS' })).toBeInTheDocument();
    expect(screen.getByText(SAFETY_DISCLOSURE_RU)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /экстренную службу/ })).toBeInTheDocument();
    expect(screen.getByText('Что делать прямо сейчас')).toBeInTheDocument();
    expect(screen.getByText('Локальный таймер проверки')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Открыть безопасность' })).toBeInTheDocument();
  });

  it('hides trusted contact action when no contact configured and shows it when set', () => {
    const { unmount } = render(<SosSheet open onClose={() => {}} onOpenSafetyHub={() => {}} />);
    expect(screen.queryByText(/доверенному контакту/)).not.toBeInTheDocument();
    unmount();
    render(
      <SosSheet open onClose={() => {}} trustedContact="+79990001122" onOpenSafetyHub={() => {}} />
    );
    expect(screen.getByRole('link', { name: /доверенному контакту/ })).toBeInTheDocument();
  });

  it('calls onOpenSafetyHub and never renders forbidden promises', async () => {
    const openHub = vi.fn();
    render(<SosSheet open onClose={() => {}} onOpenSafetyHub={openHub} />);
    await userEvent.click(screen.getByRole('button', { name: 'Открыть безопасность' }));
    expect(openHub).toHaveBeenCalled();
    for (const claim of FORBIDDEN_CLAIMS) {
      expect(screen.queryByText(new RegExp(claim, 'i'))).not.toBeInTheDocument();
    }
  });

  it('renders nothing when closed', () => {
    render(<SosSheet open={false} onClose={() => {}} onOpenSafetyHub={() => {}} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
