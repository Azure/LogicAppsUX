import { Button } from '@fluentui/react-components';
import { bundleIcon, ChevronRightFilled, ChevronRightRegular } from '@fluentui/react-icons';
import { useRunLogActionValuesStyles } from './runLogActionValues.styles';

const ChevronIcon = bundleIcon(ChevronRightFilled, ChevronRightRegular);

export interface ValueLinkProps {
  linkText: string;
  visible?: boolean;
  onLinkClick?(): void;
}

export const ValueLink: React.FC<ValueLinkProps> = ({ linkText, visible = false, onLinkClick }) => {
  const styles = useRunLogActionValuesStyles();

  const handleClick: React.MouseEventHandler<HTMLElement> = (e) => {
    e.preventDefault();
    onLinkClick?.();
  };

  if (!visible) {
    return null;
  }

  return (
    <Button className={styles.valueLink} onClick={handleClick} icon={<ChevronIcon />} iconPosition="after" appearance="subtle">
      {linkText}
    </Button>
  );
};
