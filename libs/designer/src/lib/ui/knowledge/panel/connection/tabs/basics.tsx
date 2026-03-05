import type { AppDispatch } from '../../../../../core/state/knowledge/store';
import type { McpCreateAppTabProps, McpPanelTabProps } from '@microsoft/designer-ui';
import type { IntlShape } from 'react-intl';
import { closePanel } from '../../../../../core/state/knowledge/panelSlice';
import Constants from '../../../../../common/constants';

export const basicsTab = (
  intl: IntlShape,
  dispatch: AppDispatch,
  { isTabDisabled, isPrimaryButtonDisabled, tabStatusIcon, onPrimaryButtonClick }: McpCreateAppTabProps
): McpPanelTabProps => ({
  id: Constants.KNOWLEDGE_PANEL_TAB_NAMES.BASICS,
  title: intl.formatMessage({
    defaultMessage: 'Basics',
    id: 'g3DKT8',
    description: 'The tab label for basics tab for quick app create panel',
  }),
  tabStatusIcon,
  content: <Basics />,
  disabled: isTabDisabled,
  footerContent: {
    buttonContents: [
      {
        type: 'navigation',
        text: intl.formatMessage({
          defaultMessage: 'Close',
          id: 'FTrMxN',
          description: 'Button text for closing the panel',
        }),
        onClick: () => {
          dispatch(closePanel());
        },
      },
      {
        type: 'navigation',
        text: intl.formatMessage({
          defaultMessage: 'Next',
          id: 'ZWnmOv',
          description: 'Button text for moving to the next tab in the connector panel',
        }),
        onClick: () => {
          onPrimaryButtonClick?.();
        },
        appearance: 'primary',
        disabled: isPrimaryButtonDisabled,
      },
    ],
  },
});

const Basics = () => {
  return <div>Basics Content</div>;
};
