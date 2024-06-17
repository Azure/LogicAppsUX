import { isNullOrUndefined } from '@microsoft/logic-apps-shared';
import type { AppDispatch, RootState } from '../../../../../core/state/templates/store';
import { useSelector } from 'react-redux';
import type { IntlShape } from 'react-intl';
import constants from '../../../../../common/constants';
import { selectPanelTab } from '../../../../../core/state/templates/panelSlice';

export const OverviewPanel: React.FC = () => {
  const { manifest } = useSelector((state: RootState) => state.template);

  return isNullOrUndefined(manifest) ? null : (
    <div>
      Overview Tab Placeholder
      <div>Manifest Data: {JSON.stringify(manifest)}</div>
    </div>
  );
};

export const overviewTab = (intl: IntlShape, dispatch: AppDispatch) => ({
  id: constants.TEMPLATE_PANEL_TAB_NAMES.OVERVIEW,
  title: intl.formatMessage({
    defaultMessage: 'Overview',
    id: '+YyHKB',
    description: 'The tab label for the monitoring parameters tab on the operation panel',
  }),
  description: intl.formatMessage({
    defaultMessage: 'Overview Tab',
    id: 'EJj4E0',
    description: 'An accessability label that describes the oveview tab',
  }),
  visible: true,
  content: <OverviewPanel />,
  order: 1,
  footerContent: {
    primaryButtonText: 'Next',
    primaryButtonOnClick: () => {
      //TODO: revisit. if parameters is invisible, we should skip to the next visible tab
      dispatch(selectPanelTab(constants.TEMPLATE_PANEL_TAB_NAMES.PARAMETERS));
    },
    primaryButtonDisabled: false,
    onClose: () => {},
  },
});
