import { Text, IconButton } from '@fluentui/react';
import type { IIconProps } from '@fluentui/react';

export const SelectedList: React.FC<any> = ({ selectedWorkflows }) => {
  const emojiIcon: IIconProps = { iconName: 'Cancel' };

  const renderWorkflows = selectedWorkflows.map((workflow: any) => {
    return (
      <div key={workflow.id} className="msla-export-overview-panel-selected-list-item">
        <IconButton iconProps={emojiIcon} aria-label="cancel" />
        <Text variant="large" nowrap block>
          {workflow.name}
        </Text>
        <Text variant="mediumPlus" nowrap block className="msla-export-overview-panel-selected-list-item-subtext">
          ({workflow.resourceGroup})
        </Text>
      </div>
    );
  });
  return (
    <div className="msla-export-overview-panel-selected-list">
      <Text variant="xLarge" nowrap block>
        Selected Apps
      </Text>
      {renderWorkflows}
    </div>
  );
};
