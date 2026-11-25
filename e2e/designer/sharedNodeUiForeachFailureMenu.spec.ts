import { expect, test } from '@playwright/test';
import { openSharedWorkflow, waitForViewport } from './utils/sharedNodeUi';

const scopeRunId = '/foreach-failure-menu-run';
const scopeRepetitions = `/url${scopeRunId}/actions/Foreach/scopeRepetitions`;
const times = { startTime: '2026-01-01T00:00:00Z', endTime: '2026-01-01T00:00:01Z' };

test(
  'jumps between confirmed Foreach failures by keyboard without clipping the pager or covering the outgoing edge',
  {
    tag: ['@mock', '@shared-node-ui'],
  },
  async ({ page }) => {
    // Dev-mode StandardRunService returns no failed repetitions before calling HTTP. Exercise the real
    // Standard request builder on the fixture only; all other run service calls stay in Local dev mode.
    await page.route(/\/LocalDesigner\/localDesignerV2\.tsx(?:\?|$)/, async (route) => {
      const response = await route.fetch();
      await route.fulfill({
        response,
        body: `${await response.text()}
        const fixtureRunService = new runService.constructor({
          ...runService.options,
          isDev: false,
          httpClient: {
            async get({ uri, queryParameters }) {
              const url = new URL(uri, window.location.origin);
              url.search = new URLSearchParams(queryParameters).toString();
              const response = await fetch(url);
              if (!response.ok) throw new Error("Foreach fixture returned HTTP " + response.status);
              return response.json();
            },
          },
        });
        const originalGetScopeRepetitions = runService.getScopeRepetitions.bind(runService);
        runService.getScopeRepetitions = (action, status) =>
          action.runId === ${JSON.stringify(scopeRunId)} && action.nodeId === "Foreach" && status === "Failed"
            ? fixtureRunService.getScopeRepetitions(action, status)
            : originalGetScopeRepetitions(action, status);`,
      });
    });
    await page.route(
      (url) => url.pathname === scopeRepetitions,
      (route) =>
        route.fulfill({
          json: {
            value: [1, 5].map((itemIndex) => ({
              id: `${scopeRunId}/actions/Foreach/scopeRepetitions/${String(itemIndex).padStart(6, '0')}`,
              properties: { ...times, status: 'Failed', repetitionIndexes: [{ scopeName: 'Foreach', itemIndex }] },
            })),
          },
        })
    );

    await openSharedWorkflow(page, 'ForEach');
    await page.evaluate(() => {
      const store = window.DesignerStoreV2;
      store.dispatch({
        type: 'designerOptions/initDesignerOptions',
        payload: { ...store.getState().designerOptions, isMonitoringView: true, readOnly: true },
      });
    });
    const history = page.locator('.fui-InlineDrawer').filter({ has: page.getByRole('heading', { name: 'Run history', exact: true }) });
    await history.locator('.fui-DrawerHeaderNavigation button').click();
    await expect(history).toBeHidden();

    const [filteredRequest] = await Promise.all([
      page.waitForRequest((request) => new URL(request.url()).pathname === scopeRepetitions),
      page.evaluate(
        ({ scopeRunId, times }) => {
          const store = window.DesignerStoreV2;
          store.dispatch({ type: 'workflow/setRunIndex', payload: { nodeId: 'Foreach', page: 3 } });
          store.dispatch({
            type: 'workflow/setRepetitionRunData',
            payload: { nodeId: 'Foreach', runData: { ...times, status: 'Failed', iterationCount: 123456 } },
          });
          store.dispatch({
            type: 'workflow/setRunInstance',
            payload: { id: scopeRunId, name: scopeRunId.slice(1), properties: { status: 'Failed' } },
          });
        },
        { scopeRunId, times }
      ),
    ]);
    const query = new URL(filteredRequest.url()).searchParams;
    expect(query.get('$filter')).toBe("status eq 'Failed'");
    expect(query.get('api-version')).toBe('2018-11-01');

    await page.getByRole('button', { name: 'Zoom view to fit', exact: true }).click();
    await waitForViewport(page);

    const card = page.locator('#msla-node-Foreach[data-node-card="foreach"]');
    const row = card.locator('[data-loop-pager-row]');
    const pager = row.getByRole('group', { name: 'Iterations', exact: true });
    const number = pager.getByRole('textbox', { name: /Iteration number, 1 to 123[,\s]?456/ });
    const chooser = pager.getByRole('button', { name: 'Jump to failed iteration', exact: true });
    await expect(number).toHaveValue('4');
    await expect(chooser).toHaveAttribute('aria-haspopup', 'menu');
    await expect(pager.getByRole('combobox')).toHaveCount(0);

    await chooser.press('ArrowDown');
    const menu = page.getByRole('menu').filter({ has: page.getByRole('menuitem', { name: 'Failed iteration 2', exact: true }) });
    const previousFailure = menu.getByRole('menuitem', { name: 'Previous failed iteration', exact: true });
    const nextFailure = menu.getByRole('menuitem', { name: 'Next failed iteration', exact: true });
    await expect(menu.getByRole('menuitem')).toHaveText([
      'Previous failed iteration',
      'Next failed iteration',
      'Failed iteration 2',
      'Failed iteration 6',
    ]);
    await expect(previousFailure).toBeEnabled();
    await expect(nextFailure).toBeEnabled();
    await expect(previousFailure).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    await expect(chooser).toBeFocused();
    await expect(number).toHaveValue('4');

    await chooser.press('ArrowDown');
    await expect(previousFailure).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(nextFailure).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(menu).toBeHidden();
    await expect(number).toHaveValue('6');

    const total = pager.getByText('/ 123456', { exact: true });
    await expect(total).toBeInViewport({ ratio: 1 });
    await expect
      .poll(() =>
        total.evaluate((element) => {
          const row = element.closest('[data-loop-pager-row]')!.getBoundingClientRect();
          const label = element.getBoundingClientRect();
          const range = document.createRange();
          range.selectNodeContents(element);
          const text = range.getBoundingClientRect();
          return text.width > 0 && text.left >= Math.max(row.left, label.left) - 1 && text.right <= Math.min(row.right, label.right) + 1;
        })
      )
      .toBe(true);

    const port = card.locator('.react-flow__handle.source');
    // Same clearance predicate as the existing simulated-run spec; use the actual React Flow path, not its painted arrow.
    const outgoing = page.locator('.react-flow__edge[data-id^="Foreach%2D#scope-"] .msla-shared-edge-path').first();
    await expect
      .poll(async () => {
        const controls = await pager.boundingBox();
        const source = await port.boundingBox();
        const edgeStartY = await outgoing.evaluate((path: SVGPathElement) => {
          const transform = path.getScreenCTM();
          return transform && path.getPointAtLength(0).matrixTransform(transform).y;
        });
        return controls && source && edgeStartY !== null
          ? Math.min(source.y + source.height, edgeStartY) - (controls.y + controls.height)
          : -1;
      })
      .toBeGreaterThanOrEqual(0);
  }
);
