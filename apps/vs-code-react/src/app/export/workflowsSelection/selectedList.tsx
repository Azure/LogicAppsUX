import type { WorkflowsList } from '../../../run-service';
import type { RootState } from '../../../state/store';
import { IconButton, Shimmer } from '@fluentui/react';
import type { IIconProps } from '@fluentui/react';
import { LargeText, MediumText, XLargeText } from '@microsoft/designer-ui';
import { useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';

export interface ISelectedListProps {
  isLoading: boolean;
  deselectWorkflow: (workflowKey: string) => void;
}

export const SelectedList: React.FC<ISelectedListProps> = ({ isLoading, deselectWorkflow }) => {
  const intl = useIntl();
  const workflowState = useSelector((state: RootState) => state.workflow);
  const { exportData } = workflowState;
  const { selectedWorkflows } = exportData;

  const intlText = {
    SELECTED_APPS: intl.formatMessage({
      defaultMessage: 'Selected logic apps',
      id: 'ms7c3a439dc259',
      description: 'Selected logic apps title',
    }),
  };

  const shimmerList = useMemo(() => {
    return new Array(5).fill(0).map((_element, index) => {
      return <Shimmer className="msla-export-workflows-panel-selected-list-shimmer" key={index} />;
    });
  }, []);

  const renderItems = useMemo(() => {
    const getList = (list: WorkflowsList[]) => {
      return list.map((workflow: WorkflowsList) => {
        const { name, resourceGroup } = workflow;
        const deselectIcon: IIconProps = { iconName: 'Cancel' };
        const deselectButton = <IconButton iconProps={deselectIcon} aria-label="cancel" onClick={() => deselectWorkflow(workflow.key)} />;

        return (
          <div key={workflow.key} className="msla-export-workflows-panel-selected-list-item">
            {deselectButton}
            <LargeText
              text={`${name} `}
              style={{ display: 'block', whiteSpace: 'nowrap' }}
              className="msla-export-workflows-panel-selected-list-item-text"
            />
            <div className="msla-export-workflows-panel-selected-list-item-subtext">
              <MediumText text={resourceGroup} style={{ display: 'block', whiteSpace: 'nowrap' }} />
            </div>
          </div>
        );
      });
    };

    return isLoading ? shimmerList : getList(selectedWorkflows);
  }, [isLoading, shimmerList, selectedWorkflows, deselectWorkflow]);

  return (
    <div className="msla-export-workflows-panel-selected">
      <XLargeText text={intlText.SELECTED_APPS} style={{ display: 'block' }} className="msla-export-workflows-panel-selected-title" />
      <div className="msla-export-workflows-panel-selected-list">{renderItems}</div>
    </div>
  );
};
