import EmptyPanel from './images/empty-panel.svg';
import { useIntl } from 'react-intl';
import { usePanelStyles, getPanelClasses } from '../panel/styles';
import { useTheme } from '@fluentui/react';

export const EmptyContent: React.FC = () => {
  const intl = useIntl();
  const theme = useTheme();
  const styles = usePanelStyles();
  const classes = getPanelClasses(styles, theme.isInverted);

  const emptyContentMessage = intl.formatMessage({
    defaultMessage: 'Please select a card to see the content',
    id: 'HfrUId',
    description: 'Empty Panel Content Message',
  });
  return (
    <div className={classes.panelSelectCardContainerEmpty}>
      <img src={EmptyPanel} alt="" role="presentation" />
      <p className={classes.panelEmptyText}>{emptyContentMessage}</p>
    </div>
  );
};
