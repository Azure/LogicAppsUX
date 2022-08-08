import type { SelectedWorkflowsList, WorkflowsList } from '../../../run-service';
import type { RootState } from '../../../state/store';
import type { InitializedVscodeState } from '../../../state/vscodeSlice';
import { Shimmer, Text } from '@fluentui/react';
import { useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';

export const SelectedList: React.FC<any> = ({ isLoading, allWorkflows, renderWorkflows }) => {
  const intl = useIntl();
  const vscodeState = useSelector((state: RootState) => state.vscode);
  const { exportData } = vscodeState as InitializedVscodeState;
  const { selectedWorkflows } = exportData;
  const [allItems, setAllItems] = useState<SelectedWorkflowsList[]>(allWorkflows);

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

  const getList = (list: SelectedWorkflowsList[]) => {
    return list.map((workflow: SelectedWorkflowsList) => {
      const { name, resourceGroup } = workflow;
      return (
        <div key={workflow.key} className="msla-export-workflows-panel-selected-list-item">
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

  useEffect(() => {
    const copySelectedItems = JSON.parse(JSON.stringify(!allItems.length ? allWorkflows : allItems));

    renderWorkflows?.forEach((workflow: WorkflowsList) => {
      const isWorkflowInSelection = !!selectedWorkflows.find((selectedWorkflow: WorkflowsList) => selectedWorkflow.key === workflow.key);
      const foundIndex = copySelectedItems.findIndex((selectedItem: any) => selectedItem.key === workflow.key);

      if (foundIndex !== -1) {
        copySelectedItems[foundIndex].selected = isWorkflowInSelection;
      }
    });

    setAllItems(copySelectedItems);
  }, [selectedWorkflows, renderWorkflows, allItems, allWorkflows]);

  const renderItems = useMemo(() => {
    const selectedItems = [...allItems.filter((item) => item.selected)];
    return isLoading ? shimmerList : getList(selectedItems);
  }, [isLoading, shimmerList, allItems]);

  return (
    <div className="msla-export-workflows-panel-selected">
      <Text variant="xLarge" block className="msla-export-workflows-panel-selected-title">
        {intlText.SELECTED_APPS}
      </Text>
      <div className="msla-export-workflows-panel-selected-list">{renderItems}</div>
    </div>
  );
};
