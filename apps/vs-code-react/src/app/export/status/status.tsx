import { Status as FinalStatus } from '../../../state/WorkflowSlice';
import type { RootState } from '../../../state/store';
import { List, Icon, Spinner, SpinnerSize } from '@fluentui/react';
import { MediumText, XLargeText } from '@microsoft/designer-ui';
import { useExportStrings } from '../../../assets/strings';
import { useSelector } from 'react-redux';

export const Status: React.FC = () => {
  const workflowState = useSelector((state: RootState) => state.workflow);
  const statuses = workflowState.statuses ?? [];
  const finalStatus = workflowState.finalStatus;
  const { EXPORT_STATUS_TITLE } = useExportStrings();

  const renderStatus = (status?: string, index?: number): JSX.Element => {
    const icon =
      index === statuses.length - 1 && finalStatus !== FinalStatus.Succeeded ? (
        <Spinner size={SpinnerSize.small} />
      ) : (
        <Icon iconName={'SkypeCheck'} />
      );

    return (
      <div key={`index-${finalStatus}`} className="msla-export-status--item">
        {icon}
        <MediumText text={status ?? ''} style={{ marginLeft: '5px' }} />
      </div>
    );
  };

  return (
    <div className="msla-export-status">
      <XLargeText text={EXPORT_STATUS_TITLE} style={{ display: 'block' }} />
      <List items={statuses} onRenderCell={renderStatus} />
      <FinalStatusGadget finalStatus={finalStatus} />
    </div>
  );
};

interface FinalStatusGadgetProps {
  finalStatus: string | undefined;
}

const FinalStatusGadget: React.FC<FinalStatusGadgetProps> = ({ finalStatus }) => {
  const workflowState = useSelector((state: RootState) => state.workflow);
  const { targetDirectory } = workflowState.exportData;
  const { EXPORT_NEXT_STEPS_PATH } = useExportStrings({ targetDirectoryPath: targetDirectory.path });

  switch (finalStatus) {
    case FinalStatus.Succeeded:
      return (
        <div className="msla-export-status--item">
          <Icon iconName={'SkypeCheck'} />
          <MediumText text={EXPORT_NEXT_STEPS_PATH} style={{ marginLeft: '5px' }} />
        </div>
      );
    default:
      return null;
  }
};
