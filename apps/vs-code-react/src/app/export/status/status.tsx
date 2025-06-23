import { Status as FinalStatus } from '../../../state/WorkflowSlice';
import type { RootState } from '../../../state/store';
import { Spinner } from '@fluentui/react-components';
import { CheckmarkCircleRegular } from '@fluentui/react-icons';
import { MediumText, XLargeText } from '@microsoft/designer-ui';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';

export const Status: React.FC = () => {
  const intl = useIntl();
  const workflowState = useSelector((state: RootState) => state.workflow);
  const statuses = workflowState.statuses ?? [];
  const finalStatus = workflowState.finalStatus;

  const intlText = {
    EXPORT_STATUS_TITLE: intl.formatMessage({
      defaultMessage: 'Export status',
      id: '3rpbrs',
      description: 'Export status title',
    }),
  };

  const renderStatus = (status?: string, index?: number): JSX.Element => {
    const icon =
      index === statuses.length - 1 && finalStatus !== FinalStatus.Succeeded ? <Spinner size="small" /> : <CheckmarkCircleRegular />;

    return (
      <div key={`index-${finalStatus}`} className="msla-export-status--item">
        {icon}
        <MediumText text={status ?? ''} style={{ marginLeft: '5px' }} />
      </div>
    );
  };

  return (
    <div className="msla-export-status">
      <XLargeText text={intlText.EXPORT_STATUS_TITLE} style={{ display: 'block' }} />
      <div className="msla-export-status-list">{statuses.map((status, index) => renderStatus(status, index))}</div>
      <FinalStatusGadget finalStatus={finalStatus} />
    </div>
  );
};

interface FinalStatusGadgetProps {
  finalStatus: string | undefined;
}

const FinalStatusGadget: React.FC<FinalStatusGadgetProps> = ({ finalStatus }) => {
  const intl = useIntl();
  const workflowState = useSelector((state: RootState) => state.workflow);
  const { targetDirectory } = workflowState.exportData;

  const exportNextStepsPath = intl.formatMessage(
    {
      defaultMessage: 'For next steps, review the {path} file.',
      id: 's78iEA',
      description: 'Message for next steps after export',
    },
    {
      path: `${targetDirectory.path}/.logs/export/README.md`,
    }
  );

  switch (finalStatus) {
    case FinalStatus.Succeeded:
      return (
        <div className="msla-export-status--item">
          <CheckmarkCircleRegular />
          <MediumText text={exportNextStepsPath} style={{ marginLeft: '5px' }} />
        </div>
      );
    default:
      return null;
  }
};
