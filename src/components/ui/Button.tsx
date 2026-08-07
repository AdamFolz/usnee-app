import { ButtonHTMLAttributes, forwardRef } from 'react';
import { LoaderCircle } from 'lucide-react';
import { cx } from './utils';

export type ButtonVariant = 'primary' | 'secondary' | 'glass' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  iconOnly?: boolean;
}

const variants: Record<ButtonVariant, string> = {
  primary: 'border-transparent bg-brand-gradient text-white shadow-hero',
  secondary: 'border-usnee-border bg-usnee-surface2 text-usnee-text hover:bg-usnee-surface3',
  glass: 'border-usnee-border bg-usnee-glass text-usnee-text backdrop-blur-glass hover:bg-usnee-glassStrong',
  danger: 'border-transparent bg-danger-gradient text-white shadow-sos',
  ghost: 'border-transparent bg-transparent text-usnee-text2 hover:bg-usnee-glass'
};

const sizes: Record<ButtonSize, string> = {
  sm: 'min-h-12 px-4 text-xs',
  md: 'min-h-12 px-5 text-sm',
  lg: 'min-h-14 px-6 text-base'
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    iconOnly = false,
    disabled,
    className,
    children,
    type = 'button',
    ...props
  },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-md border font-semibold transition-[transform,background-color,border-color,opacity] duration-normal ease-ui focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-usnee-focus focus-visible:ring-offset-2 focus-visible:ring-offset-usnee-bg active:scale-[.97] disabled:cursor-not-allowed disabled:opacity-45 motion-reduce:transform-none',
        variants[variant],
        iconOnly ? 'h-12 w-12 p-0' : sizes[size],
        className
      )}
      {...props}
    >
      {loading && <LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
      {children}
    </button>
  );
});
