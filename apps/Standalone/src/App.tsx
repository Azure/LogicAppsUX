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
import { lazy, Suspense } from 'react';

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
    <Suspense fallback={null}>
      <DesignerWrapperLazy />
    </Suspense>
  </Provider>
);
const DesignerWrapperLazy = lazy(() =>
  import('./designer/app/DesignerShell/designer').then((m) => ({ default: m.DesignerWrapper as any }))
);

const DesignerStandaloneV2 = () => (
  <Provider store={designerStore}>
    <Suspense fallback={null}>
      <DesignerWrapperV2Lazy />
    </Suspense>
  </Provider>
);
const DesignerWrapperV2Lazy = lazy(() =>
  import('./designer/app/DesignerShell/designerV2').then((m) => ({ default: m.DesignerWrapper as any }))
);

const DataMapperV1 = () => (
  <Provider store={dataMapperStore}>
    <Suspense fallback={null}>
      <DataMapperWrapperLazy />
    </Suspense>
  </Provider>
);
const DataMapperWrapperLazy = lazy(() =>
  import('./dataMapperV1/app/DataMapperStandaloneDesignerV1').then((m) => ({ default: m.DataMapperStandaloneDesignerV1 as any }))
);

const DataMapperV2 = () => (
  <Provider store={dataMapperStore}>
    <Suspense fallback={null}>
      <DataMapperWrapperV2Lazy />
    </Suspense>
  </Provider>
);
const DataMapperWrapperV2Lazy = lazy(() =>
  import('./dataMapperV1/app/DataMapperStandaloneDesignerV2').then((m) => ({ default: m.DataMapperStandaloneDesignerV2 as any }))
);

const TemplatesStandalone = () => (
  <Provider store={templateStore}>
    <Suspense fallback={null}>
      <TemplatesWrapperLazy />
    </Suspense>
  </Provider>
);
const TemplatesWrapperLazy = lazy(() => import('./templates/app/TemplatesShell').then((m) => ({ default: m.TemplatesWrapper as any })));

const ConfigureTemplateStandalone = () => (
  <Provider store={configureTemplateStore}>
    <Suspense fallback={null}>
      <ConfigureTemplateWrapperLazy />
    </Suspense>
  </Provider>
);
const ConfigureTemplateWrapperLazy = lazy(() =>
  import('./configuretemplate/app/ConfigureTemplateShell').then((m) => ({ default: m.ConfigureTemplateWrapper as any }))
);

const McpStandalone = () => (
  <Provider store={mcpStore}>
    <Suspense fallback={null}>
      <McpWrapperLazy />
    </Suspense>
  </Provider>
);
const McpWrapperLazy = lazy(() => import('./mcp/app/McpShell').then((m) => ({ default: m.McpWrapper as any })));

const CloneToStandard = () => (
  <Provider store={cloneToStandardStore}>
    <Suspense fallback={null}>
      <CloneToStandardWrapperLazy />
    </Suspense>
  </Provider>
);
const CloneToStandardWrapperLazy = lazy(() =>
  import('./clonetostandard/app/cloneshell').then((m) => ({ default: m.CloneToStandardWrapper as any }))
);

const VSCodeStandalone = () => (
  <Provider store={vscodeStore}>
    <Suspense fallback={null}>
      <VSCodeWrapperLazy />
    </Suspense>
  </Provider>
);
const VSCodeWrapperLazy = lazy(() => import('./vscode/VSCodeWrapper').then((m) => ({ default: m.VSCodeWrapper as any })));
