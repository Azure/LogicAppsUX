// eslint-disable-next-line @nrwl/nx/enforce-module-boundaries
import type { OutletContext } from '../../run-service';
import type { RootState } from '../../state/store';
import './export.less';
import { Navigation } from './navigation/navigation';
import { Text } from '@fluentui/react';
import { useSelector } from 'react-redux';
import { Outlet, useOutletContext } from 'react-router-dom';

export const ExportApp: React.FC = () => {
  const workflowState = useSelector((state: RootState) => state.workflow);

  return (
    <div className="msla-export">
      <Text variant="xxLarge" className="msla-export-title" block>
        Export logic app
      </Text>
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
