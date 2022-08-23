import { ExportApp } from '../app/export/export';
import { InstanceSelection } from '../app/export/instanceSelection/instanceSelection';
import { Status } from '../app/export/status/status';
import { Summary } from '../app/export/summary/summary';
import { Validation } from '../app/export/validation/validation';
import { WorkflowsSelection } from '../app/export/workflowsSelection/workflowsSelection';
import { OverviewApp } from '../app/overview/index';
import { ReviewApp } from '../app/review';
import { RouteName } from '../run-service';
import { StateWrapper } from '../stateWrapper';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

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
      </Routes>
    </MemoryRouter>
  );
};
