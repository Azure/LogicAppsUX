import type { WorkflowsList } from '../../../run-service';
import type { RootState } from '../../../state/store';
import type { initializedVscodeState } from '../../../state/vscodeSlice';
import { Text, IconButton } from '@fluentui/react';
import type { IIconProps } from '@fluentui/react';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';

export const SelectedList: React.FC<any> = ({ deselectItem }) => {
  const intl = useIntl();
  const vscodeState = useSelector((state: RootState) => state.vscode);
  const { selectedWorkflows: selectedItems } = vscodeState as initializedVscodeState;

  const emojiIcon: IIconProps = { iconName: 'Cancel' };

  const intlText = {
    SELECTED_APPS: intl.formatMessage({
      defaultMessage: 'Selected Apps',
      description: 'Selected apps title',
    }),
  };

  const renderItems = selectedItems.map((workflow: WorkflowsList) => {
    const { key, name, resourceGroup } = workflow;
    return (
      <div key={workflow.key} className="msla-export-overview-panel-selected-list-item">
        <IconButton iconProps={emojiIcon} aria-label="cancel" onClick={() => deselectItem(key)} />
        <Text variant="large" nowrap block className="msla-export-overview-panel-selected-list-item-text">
          {name + ' '}
        </Text>
        <div className="msla-export-overview-panel-selected-list-item-subtext subtext-color">
          (
          <Text variant="medium" nowrap block className="subtext-color">
            {resourceGroup}
          </Text>
          )
        </div>
      </div>
    );
  });

  return (
    <div className="msla-export-overview-panel-selected">
      <Text variant="xLarge" nowrap block className="msla-export-overview-panel-selected-title">
        {intlText.SELECTED_APPS}
      </Text>
      <div className="msla-export-overview-panel-selected-list">{renderItems}</div>
    </div>
  );
};
