import type { WorkflowsList } from '../../../run-service';
import type { RootState } from '../../../state/store';
import { IconButton, Shimmer } from '@fluentui/react';
import type { IIconProps } from '@fluentui/react';
import { LargeText, MediumText, XLargeText } from '@microsoft/designer-ui';
import { useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';
import { useExportStyles } from '../exportStyles';

export interface ISelectedListProps {
  isLoading: boolean;
  deselectWorkflow: (workflowKey: string) => void;
}

export const SelectedList: React.FC<ISelectedListProps> = ({ isLoading, deselectWorkflow }) => {
  const intl = useIntl();
  const workflowState = useSelector((state: RootState) => state.workflow);
  const styles = useExportStyles();
  const { exportData } = workflowState;
  const { selectedWorkflows } = exportData;

  const intlText = {
    SELECTED_APPS: intl.formatMessage({
      defaultMessage: 'Selected logic apps',
      id: 'fDpDnc',
      description: 'Selected logic apps title',
    }),
  };

  const shimmerList = useMemo(() => {
    return new Array(5).fill(0).map((_element, index) => {
      return <Shimmer className={styles.exportWorkflowsPanelSelectedListItemShimmer} key={index} />;
    });
  }, [styles.exportWorkflowsPanelSelectedListItemShimmer]);

  const renderItems = useMemo(() => {
    const getList = (list: WorkflowsList[]) => {
      return list.map((workflow: WorkflowsList) => {
        const { name, resourceGroup } = workflow;
        const deselectIcon: IIconProps = { iconName: 'Cancel' };
        const deselectButton = <IconButton iconProps={deselectIcon} aria-label="cancel" onClick={() => deselectWorkflow(workflow.key)} />;

        return (
          <div key={workflow.key} className={styles.exportWorkflowsPanelSelectedListItem}>
            {deselectButton}
            <LargeText
              text={`${name} `}
              style={{ display: 'block', whiteSpace: 'nowrap' }}
              className={styles.exportWorkflowsPanelSelectedListItemText}
            />
            <div className={styles.exportWorkflowsPanelSelectedListItemSubtext}>
              <MediumText text={resourceGroup} style={{ display: 'block', whiteSpace: 'nowrap' }} />
            </div>
          </div>
        );
      });
    };

    return isLoading ? shimmerList : getList(selectedWorkflows);
  }, [
    isLoading,
    shimmerList,
    selectedWorkflows,
    styles.exportWorkflowsPanelSelectedListItem,
    styles.exportWorkflowsPanelSelectedListItemText,
    styles.exportWorkflowsPanelSelectedListItemSubtext,
    deselectWorkflow,
  ]);

  return (
    <div className={styles.exportWorkflowsPanelSelected}>
      <XLargeText text={intlText.SELECTED_APPS} style={{ display: 'block' }} className={styles.exportWorkflowsPanelSelectedTitle} />
      <div className={styles.exportWorkflowsPanelSelectedList}>{renderItems}</div>
    </div>
  );
};
