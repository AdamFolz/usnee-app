import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MethodGuidance } from './MethodGuidance';
import { METHOD_GUIDANCE_DISCLOSURE } from '../../constants/methodGuidance';

describe('MethodGuidance', () => {
  it('renders nothing when no method is selected', () => {
    const { container } = render(<MethodGuidance methodId={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing for an unknown method id (does not invent content)', () => {
    const { container } = render(<MethodGuidance methodId="unknown_method" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders inject guidance with rules and disclosure', () => {
    render(<MethodGuidance methodId="inject" />);
    expect(screen.getByTestId('method-guidance')).toBeInTheDocument();
    expect(screen.getByText(/Если выбрана инъекция/i)).toBeInTheDocument();
    expect(screen.getByText(/Используй только свой инструмент/i)).toBeInTheDocument();
    expect(screen.getByText(METHOD_GUIDANCE_DISCLOSURE)).toBeInTheDocument();
  });

  it('renders oral guidance without invented statistics', () => {
    render(<MethodGuidance methodId="oral" />);
    expect(screen.getByText(/Если выбран пероральный приём/i)).toBeInTheDocument();
    // Disclosure is always shown so the user knows scope
    expect(screen.getByTestId('method-guidance-disclosure')).toBeInTheDocument();
  });

  it('renders sniff guidance', () => {
    render(<MethodGuidance methodId="sniff" />);
    expect(screen.getByText(/Если выбрано нюхание/i)).toBeInTheDocument();
    expect(screen.getByText(/трубками, купюрами/i)).toBeInTheDocument();
  });

  it('renders smoke guidance', () => {
    render(<MethodGuidance methodId="smoke" />);
    expect(screen.getByText(/Если выбрано курение/i)).toBeInTheDocument();
    expect(screen.getByText(/Используй своё устройство/i)).toBeInTheDocument();
  });

  it('does not include fabricated percentages or promises', () => {
    render(<MethodGuidance methodId="inject" />);
    // No "100% / 0% / гарантированно / спасёт" wording — matches honest-scope rules.
    expect(screen.queryByText(/100%/)).not.toBeInTheDocument();
    expect(screen.queryByText(/гарантированно/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/спасёт жизнь/i)).not.toBeInTheDocument();
  });
});
