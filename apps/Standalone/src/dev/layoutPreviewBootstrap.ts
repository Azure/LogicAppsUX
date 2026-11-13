import { store } from '../designer/state/store';
import { loadWorkflow, setHostingPlan, setDarkMode, setIsLocalSelected, setResourcePath } from '../designer/state/workflowLoadingSlice';

const workflow = new URLSearchParams(window.location.search).get('workflow') ?? 'Scoped';
store.dispatch(setHostingPlan('standard'));
store.dispatch(setIsLocalSelected(true));
store.dispatch(setDarkMode(true));
store.dispatch(setResourcePath(workflow));
await store.dispatch(loadWorkflow(undefined));
