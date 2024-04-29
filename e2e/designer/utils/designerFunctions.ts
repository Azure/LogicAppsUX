import type { Page } from '@playwright/test';

export const getSerializedWorkflowFromState = (page: Page) => {
  return page.evaluate(async () => {
    const state = (window as any).DesignerStore.getState();
    return await (window as any).DesignerModule.serializeBJSWorkflow(state);
  });
};
