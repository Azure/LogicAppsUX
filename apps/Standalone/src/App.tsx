import './vscode/utils/mockVSCodeApi'; // Import mock early to set up global
import { Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store as designerStore } from './designer/state/store';
import { store as dataMapperStore } from './dataMapperV1/state/Store';
import { store as templateStore } from './templates/state/Store';
import { store as configureTemplateStore } from './configuretemplate/state/Store';
import { store as mcpStore } from './mcp/state/Store';
import { store as cloneToStandardStore } from './clonetostandard/state/store';
import { store as vscodeStore } from '../../vs-code-react/src/state/store';
import { DataMapperStandaloneDesignerV1 } from './dataMapperV1/app/DataMapperStandaloneDesignerV1';
import { DataMapperStandaloneDesignerV2 } from './dataMapperV1/app/DataMapperStandaloneDesignerV2';
import { TemplatesWrapper } from './templates/app/TemplatesShell';
import { ConfigureTemplateWrapper } from './configuretemplate/app/ConfigureTemplateShell';
import { DesignerWrapper } from './designer/app/DesignerShell/designer';
import { DesignerWrapper as DesignerWrapperV2 } from './designer/app/DesignerShell/designerV2';
import { McpWrapper } from './mcp/app/McpShell';
import { CloneToStandardWrapper } from './clonetostandard/app/cloneshell';
import { VSCodeWrapper } from './vscode/VSCodeWrapper';

export const App = () => {
  return (
    <Routes>
      <Route index element={<DesignerStandalone />} />
      <Route path="/" element={<DesignerStandalone />} />
      <Route path="/v2" element={<DesignerStandaloneV2 />} />
      <Route path="/datamapperv1" element={<DataMapperV1 />} />
      <Route path="/datamapperv2" element={<DataMapperV2 />} />
      <Route path="/templates" element={<TemplatesStandalone />} />
      <Route path="/configuretemplate" element={<ConfigureTemplateStandalone />} />
      <Route path="/mcp" element={<McpStandalone />} />
      <Route path="/clonetostandard" element={<CloneToStandard />} />
      <Route path="/vscode/*" element={<VSCodeStandalone />} />
      {/* Using path="*"" means "match anything", so this route
                acts like a catch-all for URLs that we don't have explicit
                routes for. */}
      <Route path="*" element={<DesignerStandalone />} />
    </Routes>
  );
};

const DesignerStandalone = () => (
  <Provider store={designerStore}>
    <DesignerWrapper />
  </Provider>
);

const DesignerStandaloneV2 = () => (
  <Provider store={designerStore}>
    <DesignerWrapperV2 />
  </Provider>
);

const DataMapperV1 = () => (
  <Provider store={dataMapperStore}>
    <DataMapperStandaloneDesignerV1 />
  </Provider>
);

const DataMapperV2 = () => (
  <Provider store={dataMapperStore}>
    <DataMapperStandaloneDesignerV2 />
  </Provider>
);

const TemplatesStandalone = () => (
  <Provider store={templateStore}>
    <TemplatesWrapper />
  </Provider>
);

const ConfigureTemplateStandalone = () => (
  <Provider store={configureTemplateStore}>
    <ConfigureTemplateWrapper />
  </Provider>
);

const McpStandalone = () => (
  <Provider store={mcpStore}>
    <McpWrapper />
  </Provider>
);

const CloneToStandard = () => {
  return (
    <Provider store={cloneToStandardStore}>
      <CloneToStandardWrapper />
    </Provider>
  );
};

const VSCodeStandalone = () => (
  <Provider store={vscodeStore}>
    <VSCodeWrapper />
  </Provider>
);
