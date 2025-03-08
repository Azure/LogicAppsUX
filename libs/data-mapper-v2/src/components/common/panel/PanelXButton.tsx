import { Button } from '@fluentui/react-components';
import { useStyles } from './styles';
import { Dismiss20Regular } from '@fluentui/react-icons';

export interface PanelXButtonProps {
  ariaLabel: string;
  onCloseClick: () => void;
}

export const PanelXButton = (props: PanelXButtonProps) => {
  const styles = useStyles();
  return (
    <Button
      className={styles.closeHeaderButton}
      appearance="transparent"
      aria-label={props.ariaLabel}
      icon={<Dismiss20Regular />}
      onClick={props.onCloseClick}
    />
  );
};
