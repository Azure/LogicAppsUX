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
import { CreateWorkspace } from '../app/createWorkspace/createWorkspace';
import { RouteName } from '../run-service';
import { StateWrapper } from '../stateWrapper';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { CreateLogicApp } from '../app/createLogicApp/createLogicApp';
import { CreateWorkspaceStructure } from '../app/createLogicApp/createWorkspaceStructure';

export const Router: React.FC = () => {
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
        <Route path={`/${RouteName.designer}`} element={<DesignerApp />} />
        <Route path={`/${RouteName.unitTest}`} element={<UnitTestResults />} />
        <Route path={`/${RouteName.createWorkspace}`} element={<CreateWorkspace />} />
        <Route path={`/${RouteName.createLogicApp}`} element={<CreateLogicApp />} />
        <Route path={`/${RouteName.createWorkspaceStructure}`} element={<CreateWorkspaceStructure />} />
      </Routes>
    </MemoryRouter>
  );
};
