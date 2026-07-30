import { resolveMockWorkflowFileName } from '../app/LocalDesigner/LogicAppSelector/mockWorkflowOptions';
import type { AppDispatch } from './store';
import type { HostingPlanTypes } from './workflowLoadingSlice';
import {
  changeRunId,
  loadRun,
  loadWorkflow,
  setAppid,
  setAreCustomEditorsEnabled,
  setDarkMode,
  setEnableMultiVariable,
  setHostOptions,
  setHostingPlan,
  setIsFirstDesignerV2Load,
  setIsLocalSelected,
  setLanguage,
  setMonitoringView,
  setQueryCachePersist,
  setReadOnly,
  setResourcePath,
  setShowEdgeDrawing,
  setSuppressDefaultNodeSelect,
  setWorkflowName,
} from './workflowLoadingSlice';

/**
 * Query parameters understood by the standalone designer. They exist so that automation
 * (and humans sharing repro links) can jump straight to a fully configured designer
 * instead of driving the Dev Toolbox click by click.
 *
 * Examples:
 *   /?workflow=Panel
 *   /?workflow=Simple%20Big%20Workflow&darkMode=true
 *   /?workflow=MonitoringViewConditional&runFile=normalState
 *   /?appId=/subscriptions/.../sites/my-app&workflowName=stateful1&runId=08585...
 */
export interface StandaloneUrlParams {
  /** Mock workflow file name, file key, or Dev Toolbox display name. Implies local mode. */
  workflow?: string;
  /** Mock run file name (without extension). Implies monitoring view. */
  runFile?: string;
  /** ARM resource id of a logic app. Implies Azure mode. */
  appId?: string;
  /** Workflow name within the selected logic app. Requires `appId`. */
  workflowName?: string;
  /** Run instance name for Azure monitoring view. Requires `appId` and `workflowName`. */
  runId?: string;
  hostingPlan?: HostingPlanTypes;
  language?: string;
  monitoringView?: boolean;
  readOnly?: boolean;
  darkMode?: boolean;
  customEditors?: boolean;
  showEdgeDrawing?: boolean;
  displayRuntimeInfo?: boolean;
  collapseGraphs?: boolean;
  suppressDefaultNodeSelect?: boolean;
  multiVariable?: boolean;
  queryCachePersist?: boolean;
  firstDesignerV2Load?: boolean;
  /** Whether the Dev Toolbox starts expanded. Defaults to collapsed for URL driven loads. */
  toolbox?: boolean;
}

const hostingPlans: HostingPlanTypes[] = ['standard', 'consumption', 'hybrid'];

const parseBoolean = (value: string | null): boolean | undefined => {
  if (value === null) {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === '' || normalized === 'true' || normalized === '1' || normalized === 'yes') {
    return true;
  }
  if (normalized === 'false' || normalized === '0' || normalized === 'no') {
    return false;
  }
  return undefined;
};

const parseString = (value: string | null): string | undefined => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

export const parseStandaloneUrlParams = (search: string): StandaloneUrlParams => {
  const params = new URLSearchParams(search);
  const hostingPlan = parseString(params.get('plan'))?.toLowerCase() as HostingPlanTypes | undefined;

  return {
    workflow: parseString(params.get('workflow')),
    runFile: parseString(params.get('runFile')),
    appId: parseString(params.get('appId')),
    workflowName: parseString(params.get('workflowName')),
    runId: parseString(params.get('runId')),
    hostingPlan: hostingPlan && hostingPlans.includes(hostingPlan) ? hostingPlan : undefined,
    language: parseString(params.get('language')),
    monitoringView: parseBoolean(params.get('monitoringView')),
    readOnly: parseBoolean(params.get('readOnly')),
    darkMode: parseBoolean(params.get('darkMode')),
    customEditors: parseBoolean(params.get('customEditors')),
    showEdgeDrawing: parseBoolean(params.get('showEdgeDrawing')),
    displayRuntimeInfo: parseBoolean(params.get('displayRuntimeInfo')),
    collapseGraphs: parseBoolean(params.get('collapseGraphs')),
    suppressDefaultNodeSelect: parseBoolean(params.get('suppressDefaultNodeSelect')),
    multiVariable: parseBoolean(params.get('multiVariable')),
    queryCachePersist: parseBoolean(params.get('queryCachePersist')),
    firstDesignerV2Load: parseBoolean(params.get('firstDesignerV2Load')),
    toolbox: parseBoolean(params.get('toolbox')),
  };
};

/** True when the URL asks the standalone app to load a workflow without any Dev Toolbox interaction. */
export const hasStandaloneUrlWorkflow = (search: string): boolean => {
  const { workflow, appId } = parseStandaloneUrlParams(search);
  return !!workflow || !!appId;
};

/** The Dev Toolbox starts collapsed for URL driven loads unless `toolbox` says otherwise. */
export const isToolboxExpandedByDefault = (search: string): boolean => {
  const params = parseStandaloneUrlParams(search);
  return params.toolbox ?? !(params.workflow || params.appId);
};

const findRunFile = (runFiles: any[], runFileName: string) => {
  const normalized = runFileName
    .trim()
    .toLowerCase()
    .replace(/\.json$/, '');
  return runFiles.find((runFile) => {
    const name = String(runFile?.path ?? '')
      .split('/')
      .pop()
      ?.replace(/\.json$/, '')
      .toLowerCase();
    return name === normalized;
  });
};

/**
 * Applies the synchronous slice of the URL parameters (settings + selected workflow file).
 * Runs before the first render so that options consumed at mount time - dark mode, locale,
 * query cache persistence - are already correct.
 * Returns true when the URL asks for a workflow to be loaded.
 */
export const applyStandaloneUrlSettings = (dispatch: AppDispatch, params: StandaloneUrlParams): boolean => {
  const { workflow, runFile, appId, workflowName, runId } = params;
  if (!workflow && !appId) {
    return false;
  }

  const fileName = appId ? undefined : resolveMockWorkflowFileName(workflow as string);
  if (!appId && !fileName) {
    console.warn(`[standalone] Unknown workflow "${workflow}" in URL parameters.`);
    return false;
  }

  // `setIsLocalSelected` and `setHostingPlan` both reset the app/workflow selection, so they
  // have to run before anything that sets a resource path.
  dispatch(setIsLocalSelected(!appId));
  if (params.hostingPlan) {
    dispatch(setHostingPlan(params.hostingPlan));
  }
  if (params.language !== undefined) {
    dispatch(setLanguage(params.language));
  }
  if (params.darkMode !== undefined) {
    dispatch(setDarkMode(params.darkMode));
  }
  if (params.customEditors !== undefined) {
    dispatch(setAreCustomEditorsEnabled(params.customEditors));
  }
  if (params.showEdgeDrawing !== undefined) {
    dispatch(setShowEdgeDrawing(params.showEdgeDrawing));
  }
  if (params.suppressDefaultNodeSelect !== undefined) {
    dispatch(setSuppressDefaultNodeSelect(params.suppressDefaultNodeSelect));
  }
  if (params.multiVariable !== undefined) {
    dispatch(setEnableMultiVariable(params.multiVariable));
  }
  if (params.queryCachePersist !== undefined) {
    dispatch(setQueryCachePersist(params.queryCachePersist));
  }
  if (params.firstDesignerV2Load !== undefined) {
    dispatch(setIsFirstDesignerV2Load(params.firstDesignerV2Load));
  }
  const hostOptions: Parameters<typeof setHostOptions>[0] = {};
  if (params.displayRuntimeInfo !== undefined) {
    hostOptions.displayRuntimeInfo = params.displayRuntimeInfo;
  }
  if (params.collapseGraphs !== undefined) {
    hostOptions.collapseGraphsByDefault = params.collapseGraphs;
  }
  if (Object.keys(hostOptions).length > 0) {
    dispatch(setHostOptions(hostOptions));
  }

  // Monitoring view has to be set before loading so the run files get fetched alongside the workflow.
  const isMonitoringView = params.monitoringView ?? (!!runFile || !!runId);
  if (isMonitoringView) {
    dispatch(setMonitoringView(true));
  }
  if (params.readOnly !== undefined) {
    dispatch(setReadOnly(params.readOnly));
  }

  if (appId) {
    dispatch(setAppid(appId));
    if (workflowName) {
      dispatch(setWorkflowName(workflowName));
      dispatch(setResourcePath(`${appId}/workflows/${workflowName}`));
    }
    if (runId) {
      dispatch(changeRunId(runId));
    }
    // Azure workflows are fetched by the designer itself once the resource path is set.
    return false;
  }

  dispatch(setResourcePath(fileName as string));
  return true;
};

/** Loads the mock workflow (and optional run file) requested by the URL parameters. */
export const loadStandaloneUrlWorkflow = async (dispatch: AppDispatch, params: StandaloneUrlParams): Promise<void> => {
  const result = await dispatch(loadWorkflow(undefined));

  const { runFile } = params;
  if (!runFile) {
    return;
  }
  const runFiles = (result as any)?.payload?.runFiles ?? [];
  const matchedRunFile = findRunFile(runFiles, runFile);
  if (!matchedRunFile) {
    console.warn(`[standalone] Unknown run file "${runFile}" for workflow "${params.workflow}".`);
    return;
  }
  await dispatch(loadRun({ runFile: matchedRunFile.module }));
};
