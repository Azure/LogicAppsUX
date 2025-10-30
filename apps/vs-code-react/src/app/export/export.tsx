import { XXLargeText } from '@microsoft/designer-ui';
import type { OutletContext } from '../../run-service';
import type { RootState } from '../../state/store';
import { Navigation } from './navigation/navigation';
import { useSelector } from 'react-redux';
import { useIntlMessages, exportMessages } from '../../intl';
import { Outlet, useOutletContext } from 'react-router-dom';
import { useExportStyles } from './exportStyles';

export const ExportApp: React.FC = () => {
  const workflowState = useSelector((state: RootState) => state.workflow);
  const styles = useExportStyles();

  const intlText = useIntlMessages(exportMessages);

  return (
    <div className={styles.exportContainer}>
      <XXLargeText text={intlText.EXPORT_LOGIC_APP} className={styles.exportTitle} style={{ display: 'block' }} />
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
