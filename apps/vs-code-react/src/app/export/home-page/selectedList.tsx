import type { ISelectedListProps, WorkflowsList } from '../../../run-service';
import { Text, IconButton } from '@fluentui/react';
import type { IIconProps } from '@fluentui/react';
import { useIntl } from 'react-intl';

export const SelectedList: React.FC<ISelectedListProps> = ({ selectedItems }) => {
  const emojiIcon: IIconProps = { iconName: 'Cancel' };
  const intl = useIntl();

  const intlText = {
    SELECTED_APPS: intl.formatMessage({
      defaultMessage: 'Selected Apps',
      description: 'Selected apps title',
    }),
  };

  const renderItems = selectedItems.map((workflow: WorkflowsList) => {
    return (
      <div key={workflow.key} className="msla-export-overview-panel-selected-list-item">
        <IconButton iconProps={emojiIcon} aria-label="cancel" />
        <Text variant="large" nowrap block className="msla-export-overview-panel-selected-list-item-text">
          {workflow.name + ' '}
        </Text>
        <div className="msla-export-overview-panel-selected-list-item-subtext subtext-color">
          (
          <Text variant="medium" nowrap block className="subtext-color">
            {workflow.resourceGroup}
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
