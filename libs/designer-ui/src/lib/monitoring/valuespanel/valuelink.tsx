import { Button } from '@fluentui/react-components';
import { bundleIcon, ChevronRightFilled, ChevronRightRegular } from '@fluentui/react-icons';

const ChevronIcon = bundleIcon(ChevronRightFilled, ChevronRightRegular);

export interface ValueLinkProps {
  linkText: string;
  visible?: boolean;
  onLinkClick?(): void;
}

export const ValueLink: React.FC<ValueLinkProps> = ({ linkText, visible = false, onLinkClick }) => {
  const handleClick: React.MouseEventHandler<HTMLElement> = (e) => {
    e.preventDefault();

    onLinkClick?.();
  };

  if (!visible) {
    return null;
  }

  return (
    <Button className="msla-show-raw-button" onClick={handleClick} icon={<ChevronIcon />} iconPosition="after" appearance="subtle">
      {linkText}
    </Button>
  );
};
