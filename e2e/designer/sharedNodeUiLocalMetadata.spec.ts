import { expect, test } from '@playwright/test';
import type { QueryState } from '@tanstack/react-query';
import type { AppStore } from '../../libs/designer-v2/src/lib/core/store';
import type * as ReactQueryProvider from '../../libs/designer-v2/src/lib/core/ReactQueryProvider';
import { getSerializedWorkflowFromStateV2 } from './utils/designerFunctions';
import { openSharedWorkflow } from './utils/sharedNodeUi';

type DesignerWindow = Window & { DesignerStoreV2: Pick<AppStore, 'dispatch' | 'getState'> };
const queryModule = `/@fs${process.cwd()}/libs/designer-v2/src/lib/core/ReactQueryProvider.tsx`;

test(
  'audits the actual Agent model parameter lifecycle without creating a live model connection',
  {
    tag: ['@mock', '@shared-node-ui'],
  },
  async ({ page }, testInfo) => {
    await openSharedWorkflow(page, 'Basic A2A');
    const before = await getSerializedWorkflowFromStateV2(page);
    const card = page.locator('#msla-node-WorkflowAgent');
    const parameter = await page.evaluate(() => {
      const state = (window as DesignerWindow).DesignerStoreV2.getState().operations;
      for (const [groupId, group] of Object.entries(state.inputParameters.WorkflowAgent?.parameterGroups ?? {})) {
        const parameter = group.parameters.find((entry) => entry.parameterName === 'deploymentId');
        if (parameter) {
          return { groupId, parameterId: parameter.id, value: parameter.value };
        }
      }
      return null;
    });
    if (!parameter?.value.length) {
      await expect(card.getByText('gpt-4o', { exact: true })).toBeVisible();
      await testInfo.attach('model-edit-unsupported-local', {
        body: JSON.stringify({
          evidence:
            'Existing fixture renders the definition model but supplies no editable deploymentId parameter. No model-edit UI or live connection acceptance.',
          parameter,
        }),
        contentType: 'application/json',
      });
      return;
    }
    const update = async (value: typeof parameter.value) =>
      page.evaluate(
        ({ parameter, value }) => {
          (window as DesignerWindow).DesignerStoreV2.dispatch({
            type: 'operationMetadata/updateNodeParameters',
            payload: {
              nodeId: 'WorkflowAgent',
              parameters: [{ groupId: parameter.groupId, parameterId: parameter.parameterId, propertiesToUpdate: { value } }],
            },
          });
        },
        { parameter, value }
      );
    await update([{ ...parameter.value[0], value: 'local-simulated-model' }]);
    await expect(card.getByText('local-simulated-model', { exact: true })).toBeVisible();
    await update([]);
    await expect(card.getByText('Configure model', { exact: true })).toBeVisible();
    await expect(card.getByText('gpt-4o', { exact: true })).toHaveCount(0);
    await update(parameter.value);
    await expect(card.getByText('gpt-4o', { exact: true })).toBeVisible();
    expect((await getSerializedWorkflowFromStateV2(page)).definition.actions).toEqual(before.definition.actions);
    await testInfo.attach('simulated-model-parameter-lifecycle', {
      body: JSON.stringify({
        evidence:
          'Actual loaded deploymentId parameter/reducer and host footer, deterministic edits/clear/restore; not model-edit UI or authenticated deployment validation',
      }),
      contentType: 'application/json',
    });
  }
);

for (const flag of ['true', 'false'] as const) {
  test(
    `audits actual remaining ParseJson and Query built-in metadata, flag ${flag}`,
    {
      tag: ['@mock', '@shared-node-ui'],
    },
    async ({ page }, testInfo) => {
      await openSharedWorkflow(page, 'Panel', flag);
      const before = await getSerializedWorkflowFromStateV2(page);
      const observations = [];
      for (const [id, type] of [
        ['Parse_JSON', 'ParseJson'],
        ['Filter_array', 'Query'],
      ]) {
        expect(before.definition.actions[id].type).toBe(type);
        const card = page.locator(`[id="msla-node-${id}"]`);
        await expect(card).toBeVisible();
        const metadata = await page.evaluate((id) => {
          const state = (window as DesignerWindow).DesignerStoreV2.getState().operations;
          return {
            info: state.operationInfo[id] ?? null,
            visuals: state.operationMetadata[id] ?? null,
            errors: state.errors[id] ?? null,
          };
        }, id);
        expect(metadata.info).toMatchObject({ type });
        expect(metadata.visuals).toMatchObject({ iconUri: expect.any(String) });
        expect(metadata.errors).toBeNull();
        if (flag === 'true') {
          await expect(card).toHaveAttribute('data-node-card', 'action');
          await expect(card.getByText(`Built-in · ${type}`, { exact: true })).toBeVisible();
          await expect(card.locator('[data-category="action"] svg')).toHaveCount(1);
          await expect(card.locator('[data-category="action"] img')).toHaveCount(0);
        }
        observations.push({ id, type, metadata, metadataInitialized: metadata.info !== null });
      }
      expect((await getSerializedWorkflowFromStateV2(page)).definition).toEqual(before.definition);
      await testInfo.attach('actual-residual-built-in-metadata', {
        body: JSON.stringify({
          observations,
          limit:
            'Existing actual loaded ParseJson/Query metadata and canonical icon slots only, not every raw alias, connector lifecycle or an authenticated model connection.',
        }),
        contentType: 'application/json',
      });
    }
  );

  test(
    `renders source-contract simulated manifest pending, error and empty states, flag ${flag}`,
    {
      tag: ['@mock', '@shared-node-ui'],
    },
    async ({ page }, testInfo) => {
      await openSharedWorkflow(page, 'General Run After', flag);
      const before = await getSerializedWorkflowFromStateV2(page);
      const card = page.locator('#msla-node-Compose');
      const original = await page.evaluate(async (url) => {
        const { getReactQueryClient }: typeof ReactQueryProvider = await import(url);
        const info = (window as DesignerWindow).DesignerStoreV2.getState().operations.operationInfo.Compose;
        const key = ['manifest', { connectorId: info.connectorId?.toLowerCase() }, { operationId: info.operationId?.toLowerCase() }];
        const query = getReactQueryClient().getQueryCache().find(key);
        if (!query || query.state.status !== 'success') {
          throw new Error('The actual Compose manifest query must be settled before applying deterministic component states.');
        }
        const snapshot = { key, state: query.state };
        query.setState({ data: undefined, status: 'loading', fetchStatus: 'fetching' });
        return snapshot;
      }, queryModule);
      const loading =
        flag === 'true' ? card.getByRole('progressbar', { name: 'Loading operation', exact: true }) : card.locator('.fui-Spinner');
      await expect(loading).toHaveCount(1);
      await page.evaluate(
        async ({ url, key }) => {
          const { getReactQueryClient }: typeof ReactQueryProvider = await import(url);
          getReactQueryClient()
            .getQueryCache()
            .find(key)!
            .setState({
              status: 'error',
              fetchStatus: 'idle',
              data: undefined,
              error: new Error('Deterministic Local manifest failure'),
            });
        },
        { url: queryModule, key: original.key }
      );
      await expect(loading).toHaveCount(0);
      await expect(card.getByRole('img', { name: 'Errors', exact: true })).toBeVisible();
      await page.evaluate(
        async ({ url, key }) => {
          const { getReactQueryClient }: typeof ReactQueryProvider = await import(url);
          getReactQueryClient()
            .getQueryCache()
            .find(key)!
            .setState({
              status: 'success',
              fetchStatus: 'idle',
              data: { properties: {} },
              error: null,
            });
        },
        { url: queryModule, key: original.key }
      );
      await expect(loading).toHaveCount(0);
      if (flag === 'true') {
        await expect(card.getByRole('img', { name: 'Errors', exact: true })).toBeVisible();
      }
      await page.evaluate(
        async ({ url, key, state }) => {
          const { getReactQueryClient }: typeof ReactQueryProvider = await import(url);
          getReactQueryClient()
            .getQueryCache()
            .find(key)!
            .setState(state as QueryState);
        },
        { url: queryModule, ...original }
      );
      await expect(loading).toHaveCount(0);
      await expect(card.getByRole('img', { name: 'Errors', exact: true })).toHaveCount(0);
      expect((await getSerializedWorkflowFromStateV2(page)).definition.actions).toEqual(before.definition.actions);
      await testInfo.attach('simulated-manifest-lifecycle', {
        body: JSON.stringify({
          evidence: 'Actual manifest query/renderer with deterministic cache state; not observed backend failure',
          key: original.key,
        }),
        contentType: 'application/json',
      });
    }
  );
}

test(
  'records the existing Local connector metadata limitation in both modes without inventing a connection',
  {
    tag: ['@mock', '@shared-node-ui'],
  },
  async ({ page }, testInfo) => {
    const observations = [];
    for (const flag of ['false', 'true'] as const) {
      await openSharedWorkflow(page, 'Conditionals (Complex)', flag);
      const before = await getSerializedWorkflowFromStateV2(page);
      expect(before.definition.actions.Create_a_goal.type).toBe('ApiConnection');
      const card = page.locator('#msla-node-Create_a_goal');
      await expect(card.getByRole('img', { name: 'Errors', exact: true })).toBeVisible();
      const metadata = await page.evaluate(() => {
        const state = (window as DesignerWindow).DesignerStoreV2.getState().operations;
        return {
          info: state.operationInfo.Create_a_goal ?? null,
          visuals: state.operationMetadata.Create_a_goal ?? null,
          errors: state.errors.Create_a_goal,
        };
      });
      expect(metadata.info).toBeNull();
      expect(metadata.visuals).toBeNull();
      expect((await getSerializedWorkflowFromStateV2(page)).definition.actions).toEqual(before.definition.actions);
      observations.push({ flag, metadata });
    }
    await testInfo.attach('local-connector-unsupported', {
      body: JSON.stringify({
        evidence:
          'Both modes fail real connector metadata initialization before an icon-bearing operation exists. No branded lifecycle acceptance or live connection is claimed.',
        observations,
      }),
      contentType: 'application/json',
    });
  }
);
