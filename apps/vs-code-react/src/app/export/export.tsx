import { XXLargeText } from '@microsoft/designer-ui';
import type { OutletContext } from '../../run-service';
import type { RootState } from '../../state/store';
import './export.less';
import { Navigation } from './navigation/navigation';
import { useSelector } from 'react-redux';
import { Outlet, useOutletContext } from 'react-router-dom';
import { useExportStrings } from '../../assets/strings';

export const ExportApp: React.FC = () => {
  const workflowState = useSelector((state: RootState) => state.workflow);
  const { EXPORT_LOGIC_APP } = useExportStrings();

  return (
    <div className="msla-export">
      <XXLargeText text={EXPORT_LOGIC_APP} className="msla-export-title" style={{ display: 'block' }} />
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
