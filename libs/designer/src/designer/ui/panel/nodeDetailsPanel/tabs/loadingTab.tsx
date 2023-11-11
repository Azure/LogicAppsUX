import constants from '../../../../common/constants';
import { Spinner, SpinnerSize } from '@fluentui/react';
import type { PanelTabFn } from '@microsoft/logic-apps-designer';

export const LoadingTab = () => {
  return (
    <div className="msla-loading-container">
      <Spinner size={SpinnerSize.large} />
    </div>
  );
};

// Riley - I'm adding this loading tab so that our tabs don't jump around in front of the user while we are loading panel data / deciding which panel to show. (Right now this is used for node creation / connection data loading when going between parameters / connection selection / connection creation)

export const loadingTab: PanelTabFn = (intl) => ({
  title: intl.formatMessage({ defaultMessage: 'Loading...', description: 'The tab label for the loading tab on the operation panel' }),
  name: constants.PANEL_TAB_NAMES.LOADING,
  description: intl.formatMessage({
    defaultMessage: 'Loading',
    description: 'An accessability label that describes the loading tab',
  }),
  visible: true,
  content: <LoadingTab />,
  order: 0,
});
