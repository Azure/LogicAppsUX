import { Status as FinalStatus } from '../../../state/WorkflowSlice';
import type { RootState } from '../../../state/store';
import { List, Icon, Spinner, SpinnerSize } from '@fluentui/react';
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
      id: 'deba5baec217',
      description: 'Export status title',
    }),
  };

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
      <XLargeText text={intlText.EXPORT_STATUS_TITLE} style={{ display: 'block' }} />
      <List items={statuses} onRenderCell={renderStatus} />
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
      id: 'b3bf22100549',
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
          <Icon iconName={'SkypeCheck'} />
          <MediumText text={exportNextStepsPath} style={{ marginLeft: '5px' }} />
        </div>
      );
    default:
      return null;
  }
};
