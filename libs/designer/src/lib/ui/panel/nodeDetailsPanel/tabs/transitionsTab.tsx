import { useReadOnly } from '../../../../core/state/designerOptions/designerOptionsSelectors';
import constants from '../../../../common/constants';
import type { PanelTabFn, PanelTabProps } from '@microsoft/designer-ui';
import { Transitions } from '../../../settings/sections/transitions';

export const TransitionsTab: React.FC<PanelTabProps> = (props) => {
  const readOnly = useReadOnly();

  return (
    <div className="transitions-tab">
      <Transitions nodeId={props.nodeId} readOnly={readOnly} />
    </div>
  );
};

export const transitionsTab: PanelTabFn = (intl, props) => ({
  id: constants.PANEL_TAB_NAMES.TRANSITIONS,
  title: intl.formatMessage({
    defaultMessage: 'Transitions',
    id: 'h+nDur',
    description: 'The tab label for the transitions tab on the operation panel',
  }),
  description: intl.formatMessage({
    defaultMessage: 'Operation transitions',
    id: 'bxL0Kj',
    description: 'An accessibility label that describes the transitions tab',
  }),
  visible: true,
  content: <TransitionsTab {...props} />,
  order: 1,
});
