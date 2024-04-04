import { Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { DesignerWrapper } from './desginer/app/DesignerShell/designer';
import { store as designerStore } from './desginer/state/store';
import { store as dataMapperStore } from './dataMapperV1/state/Store';
import { DataMapperStandaloneDesigner } from './dataMapperV1/app/DataMapperStandaloneDesigner';
export const App = () => {
  return (
    <Routes>
      <Route index element={<DesignerStandalone />} />
      <Route path="/" element={<DesignerStandalone />} />
      <Route path="datamapper" element={<DataMapper />} />
      {/* Using path="*"" means "match anything", so this route
                acts like a catch-all for URLs that we don't have explicit
                routes for. */}
      <Route path="*" element={<DesignerStandalone />} />
    </Routes>
  );
};

const DesignerStandalone = () => {
  return (
    <Provider store={designerStore}>
      <DesignerWrapper />
    </Provider>
  );
};

const DataMapper = () => {
  return (
    <Provider store={dataMapperStore}>
      <DataMapperStandaloneDesigner />
    </Provider>
  );
};
