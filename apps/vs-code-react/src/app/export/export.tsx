import { XXLargeText } from '@microsoft/designer-ui';
import type { OutletContext } from '../../run-service';
import type { RootState } from '../../state/store';
import { useExportStyles } from './exportStyles';
import { Navigation } from './navigation/navigation';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';
import { Outlet, useOutletContext } from 'react-router-dom';

export const ExportApp: React.FC = () => {
  const workflowState = useSelector((state: RootState) => state.workflow);
  const intl = useIntl();
  const styles = useExportStyles();

  const intlText = {
    EXPORT_LOGIC_APP: intl.formatMessage({
      defaultMessage: 'Export logic app',
      id: 'idw/7j',
      description: 'Export logic app text.',
    }),
  };

  return (
    <div className={styles.root}>
      <XXLargeText text={intlText.EXPORT_LOGIC_APP} className={styles.title} style={{ display: 'block' }} />
      <Outlet
        context={{
          baseUrl: workflowState.baseUrl,
          accessToken: workflowState.accessToken,
        }}
      />
      <Navigation />
    </div>
  );
};

export function useOutlet() {
  return useOutletContext<OutletContext>();
}
