import type { AppDispatch } from '../../../../../core/state/knowledge/store';
import type { McpCreateAppTabProps, McpPanelTabProps } from '@microsoft/designer-ui';
import type { IntlShape } from 'react-intl';
import { closePanel } from '../../../../../core/state/knowledge/panelSlice';

export const modelTab = (
  intl: IntlShape,
  dispatch: AppDispatch,
  { isTabDisabled, isPrimaryButtonDisabled, tabStatusIcon, onPrimaryButtonClick }: McpCreateAppTabProps
): McpPanelTabProps => ({
  id: 'model',
  title: intl.formatMessage({
    defaultMessage: 'Model',
    id: 'qlFQqe',
    description: 'The tab label for model tab for quick app create panel',
  }),
  tabStatusIcon,
  content: <Model />,
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

const Model = () => {
  return <div>Model Content</div>;
};
