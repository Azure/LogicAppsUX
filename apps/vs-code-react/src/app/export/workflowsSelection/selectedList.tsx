import type { WorkflowsList } from '../../../run-service';
import type { RootState } from '../../../state/store';
import type { InitializedVscodeState } from '../../../state/vscodeSlice';
import { Shimmer, Text } from '@fluentui/react';
import { useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';

export const SelectedList: React.FC<any> = ({ isLoading }) => {
  const intl = useIntl();
  const vscodeState = useSelector((state: RootState) => state.vscode);
  const { exportData } = vscodeState as InitializedVscodeState;
  const { selectedWorkflows: selectedItems } = exportData;

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

  const renderItems = isLoading
    ? shimmerList
    : selectedItems.map((workflow: WorkflowsList) => {
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

  return (
    <div className="msla-export-workflows-panel-selected">
      <Text variant="xLarge" block className="msla-export-workflows-panel-selected-title">
        {intlText.SELECTED_APPS}
      </Text>
      <div className="msla-export-workflows-panel-selected-list">{renderItems}</div>
    </div>
  );
};
