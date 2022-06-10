import { ExportApp } from '../app/export/app';
import { StateWrapper } from '../stateWrapper';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { OverviewApp } from '../app/overview/index';

export const Router: React.FC = () => {
    return (
    <MemoryRouter>
      <Routes>
        <Route path="/" element={<StateWrapper />} />
        <Route path="/export" element={<ExportApp />} />
        <Route path="/overview" element={<OverviewApp />} />
      </Routes>
    </MemoryRouter>
  );
};
