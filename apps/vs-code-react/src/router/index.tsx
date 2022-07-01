import { ExportApp } from '../app/export/export';
import { InstanceSelection } from '../app/export/instance-page/instance-selection';
import { SelectionPage } from '../app/export/selection-page/selection';
import { OverviewApp } from '../app/overview/index';
import { ProjectRoutes } from '../run-service';
import { StateWrapper } from '../stateWrapper';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

export const Router: React.FC = () => {
  return (
    <MemoryRouter>
      <Routes>
        <Route path="/" element={<StateWrapper />} />
        <Route path={`/${ProjectRoutes.export}`} element={<ExportApp />}>
          <Route path={`${ProjectRoutes.instance_selection}`} element={<InstanceSelection />} />
          <Route path={`${ProjectRoutes.selection}`} element={<SelectionPage />} />
        </Route>
        <Route path={`/${ProjectRoutes.overview}`} element={<OverviewApp />} />
      </Routes>
    </MemoryRouter>
  );
};
