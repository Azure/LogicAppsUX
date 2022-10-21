import constants from '../../../common/constants';
import { Spinner, SpinnerSize } from '@fluentui/react';
import type { PanelTab } from '@microsoft/designer-ui';

export const LoadingTab = () => {
  return (
    <div className="msla-loading-container">
      <Spinner size={SpinnerSize.large} />
    </div>
  );
};

// Riley - I'm adding this loading tab so that our tabs don't jump around in front of the user while we are loading panel data / deciding which panel to show. (Right now this is used for node creation / connection data loading when going between parameters / connection selection / connection creation)

export const loadingTab: PanelTab = {
  title: 'Loading...',
  name: constants.PANEL_TAB_NAMES.LOADING,
  description: 'Loading...',
  visible: true,
  content: <LoadingTab />,
  order: 0,
};
