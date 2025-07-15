import type { WorkflowsList } from '../../../run-service';
import type { RootState } from '../../../state/store';
import { LargeText, MediumText, XLargeText } from '@microsoft/designer-ui';
import { useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';
import { useExportStyles } from '../exportStyles';
import { Button, Skeleton, SkeletonItem } from '@fluentui/react-components';
import { bundleIcon, DismissFilled, DismissRegular } from '@fluentui/react-icons';

export interface ISelectedListProps {
  isLoading: boolean;
  deselectWorkflow: (workflowKey: string) => void;
}

const DismissIcon = bundleIcon(DismissFilled, DismissRegular);

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
    SHIMMER_LABEL: intl.formatMessage({
      defaultMessage: 'Loading selected logic apps',
      id: '0KDnLw',
      description: 'Shimmer label for loading selected logic apps',
    }),
    CANCEL_LABEL: intl.formatMessage({
      defaultMessage: 'Cancel',
      id: '0GT0SI',
      description: 'Cancel button label',
    }),
  };

  const shimmerList = useMemo(() => {
    return (
      <Skeleton key="shimmer" aria-label={intlText.SHIMMER_LABEL}>
        {new Array(5).fill(0).map((_element, index) => {
          return <SkeletonItem className={styles.exportWorkflowsPanelSelectedListItemShimmer} key={index} />;
        })}
      </Skeleton>
    );
  }, [intlText.SHIMMER_LABEL, styles.exportWorkflowsPanelSelectedListItemShimmer]);

  const renderItems = useMemo(() => {
    const getList = (list: WorkflowsList[]) => {
      return list.map((workflow: WorkflowsList) => {
        const { name, resourceGroup } = workflow;
        const deselectButton = (
          <Button
            appearance="transparent"
            aria-label={intlText.CANCEL_LABEL}
            onClick={() => deselectWorkflow(workflow.key)}
            icon={<DismissIcon />}
          />
        );

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
    intlText.CANCEL_LABEL,
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
