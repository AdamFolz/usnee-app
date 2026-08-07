import { Button, ButtonProps } from './Button';

export type IconButtonProps = Omit<ButtonProps, 'iconOnly'> & {
  'aria-label': string;
};

export function IconButton(props: IconButtonProps) {
  return <Button iconOnly variant="glass" {...props} />;
}
