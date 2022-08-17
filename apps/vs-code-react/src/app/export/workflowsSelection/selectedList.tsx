import type { SelectedWorkflowsList, WorkflowsList } from '../../../run-service';
import type { RootState } from '../../../state/store';
import type { InitializedVscodeState } from '../../../state/vscodeSlice';
import { updateSelectedItems } from './helper';
import { IconButton, Shimmer, Text } from '@fluentui/react';
import type { IIconProps } from '@fluentui/react';
import { useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';

export interface ISelectedListProps {
  isLoading: boolean;
  allWorkflows: WorkflowsList[];
  renderWorkflows: WorkflowsList[] | null;
  deselectWorkflow: (workflowKey: string) => void;
}

export const SelectedList: React.FC<ISelectedListProps> = ({ isLoading, allWorkflows, renderWorkflows, deselectWorkflow }) => {
  const intl = useIntl();
  const vscodeState = useSelector((state: RootState) => state.vscode);
  const { exportData } = vscodeState as InitializedVscodeState;
  const { selectedWorkflows } = exportData;
  const [allItems, setAllItems] = useState<SelectedWorkflowsList[]>(allWorkflows as SelectedWorkflowsList[]);

  const intlText = {
    SELECTED_APPS: intl.formatMessage({
      defaultMessage: 'Selected logic apps',
      description: 'Selected logic apps title',
    }),
  };

  const shimmerList = useMemo(() => {
    return new Array(5).fill(0).map((_element, index) => {
      return <Shimmer className="msla-export-workflows-panel-selected-list-shimmer" key={index} />;
    });
  }, []);

  useEffect(() => {
    const items = !allItems.length ? allWorkflows : allItems;
    const updatedItems = updateSelectedItems(items, renderWorkflows, selectedWorkflows);

    setAllItems(updatedItems);
  }, [selectedWorkflows, renderWorkflows, allItems, allWorkflows]);

  const renderItems = useMemo(() => {
    const selectedItems = [...allItems.filter((item) => item.selected)];

    const getList = (list: SelectedWorkflowsList[]) => {
      return list.map((workflow: SelectedWorkflowsList) => {
        const { name, resourceGroup } = workflow;
        const deselectIcon: IIconProps = { iconName: 'Cancel' };
        const deselectButton = <IconButton iconProps={deselectIcon} aria-label="cancel" onClick={() => deselectWorkflow(workflow.key)} />;

        return (
          <div key={workflow.key} className="msla-export-workflows-panel-selected-list-item">
            {deselectButton}
            <Text variant="large" nowrap block className="msla-export-workflows-panel-selected-list-item-text">
              {name + ' '}
            </Text>
            <div className="msla-export-workflows-panel-selected-list-item-subtext">
              (
              <Text variant="medium" nowrap block>
                {resourceGroup}
              </Text>
              )
            </div>
          </div>
        );
      });
    };

    return isLoading ? shimmerList : getList(selectedItems);
  }, [isLoading, shimmerList, allItems, deselectWorkflow]);

  return (
    <div className="msla-export-workflows-panel-selected">
      <Text variant="xLarge" block className="msla-export-workflows-panel-selected-title">
        {intlText.SELECTED_APPS}
      </Text>
      <div className="msla-export-workflows-panel-selected-list">{renderItems}</div>
    </div>
  );
};
