import type { RootState } from '../../../state/store';
import type { InitializedVscodeState } from '../../../state/vscodeSlice';
import { Status as FinalStatus } from '../../../state/vscodeSlice';
import { Text, List } from '@fluentui/react';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';

export const Status: React.FC = () => {
  const intl = useIntl();
  const vscodeState = useSelector((state: RootState) => state.vscode) as InitializedVscodeState;
  const statuses = vscodeState.statuses ?? [];

  const intlText = {
    EXPORT_STATUS_TITLE: intl.formatMessage({
      defaultMessage: 'Export status',
      description: 'Export status title',
    })
  };

  const renderStatus = (status?: string): JSX.Element => {
    return <Text block>{status}</Text>;
  };

  console.log('test');
  return (
    <div className="msla-export-status">
      <Text variant="xLarge" block>
        {intlText.EXPORT_STATUS_TITLE}
      </Text>
      <List items={statuses} onRenderCell={renderStatus} />
      <FinalStatusGadget />
    </div>
  );
};

const FinalStatusGadget: React.FC = () => {
  const intl = useIntl();
  const vscodeState = useSelector((state: RootState) => state.vscode) as InitializedVscodeState;
  const status = vscodeState.finalStatus;
  const { targetDirectory } =  vscodeState.exportData;

  const message = intl.formatMessage({
    defaultMessage: 'The selected workflows exported successfully. For next steps, review the ',
    description: 'The success message.',
  });

  switch (status)
  {
    case FinalStatus.Succeeded:
      return <Text block>{message} ${targetDirectory.path}/.logs/export/README.md</Text>;
    default:
      return null;
  }   
}
