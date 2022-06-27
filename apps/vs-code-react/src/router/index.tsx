import { ExportApp } from '../app/export/export';
import { InstanceSelection } from '../app/export/instance-page/instance-selection';
import { SelectionPage } from '../app/export/selection-page/selection';
import { OverviewApp } from '../app/overview/index';
import { StateWrapper } from '../stateWrapper';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

export const Router: React.FC = () => {
  return (
    <MemoryRouter>
      <Routes>
        <Route path="/" element={<StateWrapper />} />
        <Route path="/export" element={<ExportApp />}>
          <Route path="instance-selection" element={<InstanceSelection />} />
          <Route path="selection" element={<SelectionPage />} />
        </Route>
        <Route path="/overview" element={<OverviewApp />} />
      </Routes>
    </MemoryRouter>
  );
};
