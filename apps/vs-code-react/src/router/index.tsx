import { ExportApp } from '../app/export/export';
import { InstanceSelection } from '../app/export/instance-selection/instance-selection';
import { WorkflowsSelection } from '../app/export/workflows-selection/workflows-selection';
import { OverviewApp } from '../app/overview/index';
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
        </Route>
        <Route path={`/${RouteName.overview}`} element={<OverviewApp />} />
      </Routes>
    </MemoryRouter>
  );
};
