import { Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store as designerStore } from './designer/state/store';
import { store as dataMapperStore } from './dataMapperV1/state/Store';
import { store as templateStore } from './templates/state/Store';
import { store as configureTemplateStore } from './configuretemplate/state/Store';
import { DataMapperStandaloneDesignerV1 } from './dataMapperV1/app/DataMapperStandaloneDesignerV1';
import { DataMapperStandaloneDesignerV2 } from './dataMapperV1/app/DataMapperStandaloneDesignerV2';
import { TemplatesWrapper } from './templates/app/TemplatesShell';
import { ConfigureTemplateWrapper } from './configuretemplate/app/ConfigureTemplateShell';
import { DesignerWrapper } from './designer/app/DesignerShell/designer';

export const App = () => {
  return (
    <Routes>
      <Route index element={<DesignerStandalone />} />
      <Route path="/" element={<DesignerStandalone />} />
      <Route path="/datamapperv1" element={<DataMapperV1 />} />
      <Route path="/datamapperv2" element={<DataMapperV2 />} />
      <Route path="/templates" element={<TemplatesStandalone />} />
      <Route path="/configuretemplate" element={<ConfigureTemplateStandalone />} />
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

const DataMapperV1 = () => {
  return (
    <Provider store={dataMapperStore}>
      <DataMapperStandaloneDesignerV1 />
    </Provider>
  );
};

const DataMapperV2 = () => {
  return (
    <Provider store={dataMapperStore}>
      <DataMapperStandaloneDesignerV2 />
    </Provider>
  );
};

const TemplatesStandalone = () => {
  return (
    <Provider store={templateStore}>
      <TemplatesWrapper />
    </Provider>
  );
};

const ConfigureTemplateStandalone = () => {
  return (
    <Provider store={configureTemplateStore}>
      <ConfigureTemplateWrapper />
    </Provider>
  );
};
