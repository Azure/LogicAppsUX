import { DataMapperApp } from '../app/dataMapper/app';
import { DesignerApp } from '../app/designer/app';
// import { DesignerApp } from '../app/designer/appV2';
import { ExportApp } from '../app/export/export';
import { InstanceSelection } from '../app/export/instanceSelection/instanceSelection';
import { Status } from '../app/export/status/status';
import { Summary } from '../app/export/summary/summary';
import { Validation } from '../app/export/validation/validation';
import { WorkflowsSelection } from '../app/export/workflowsSelection/workflowsSelection';
import { OverviewApp } from '../app/overview/app';
import { ReviewApp } from '../app/review';
import { UnitTestResults } from '../app/unitTest';
import { RouteName } from '../run-service';
import { StateWrapper } from '../stateWrapper';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { RootState } from '../state/store';
import { useSelector } from 'react-redux';
import { DesignerAppV2 } from '../app/designer/appV2';
import { DesignerVersion } from '@microsoft/vscode-extension-logic-apps';

export const Router: React.FC = () => {
  const vscodeState = useSelector((state: RootState) => state.designer);
  const { designerVersion } = vscodeState;
  return (
    <MemoryRouter>
      <Routes>
        <Route path="/" element={<StateWrapper />} />
        <Route path={`/${RouteName.export}`} element={<ExportApp />}>
          <Route path={`${RouteName.instance_selection}`} element={<InstanceSelection />} />
          <Route path={`${RouteName.workflows_selection}`} element={<WorkflowsSelection />} />
          <Route path={`${RouteName.validation}`} element={<Validation />} />
          <Route path={`${RouteName.summary}`} element={<Summary />} />
          <Route path={`${RouteName.status}`} element={<Status />} />
        </Route>
        <Route path={`/${RouteName.review}`} element={<ReviewApp />} />
        <Route path={`/${RouteName.overview}`} element={<OverviewApp />} />
        <Route path={`/${RouteName.dataMapper}`} element={<DataMapperApp />} />
        <Route path={`/${RouteName.designer}`} element={designerVersion === DesignerVersion.v1 ? <DesignerApp /> : <DesignerAppV2 />} />
        <Route path={`/${RouteName.unitTest}`} element={<UnitTestResults />} />
      </Routes>
    </MemoryRouter>
  );
};
