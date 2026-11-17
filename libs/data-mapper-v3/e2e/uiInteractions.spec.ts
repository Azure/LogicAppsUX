import { teamsHighContrastTheme, webDarkTheme, webLightTheme } from '@fluentui/react-components';
import { expect, test } from './fixtures/mapperHost';
import type { MapperPage } from './pages/mapperPage';
import { createInitPayload, createMap, createMapFunctoid, createSchemaLink, paths } from './fixtures/testData';

test.use({ launchOptions: { ignoreDefaultArgs: ['--hide-scrollbars'] } });

async function openContextMenu(ui: MapperPage): Promise<void> {
  await ui.page.locator('svg.mapping-svg').click({ button: 'right', position: { x: 20, y: 70 } });
  await expect(ui.page.getByRole('menu')).toBeVisible();
}

function linkedFunctoidMap() {
  const map = createMap();
  map.pages[0].functoids.push(
    createMapFunctoid('f1', {
      inputLinks: ['name-in', 'email-in'],
      outputLinks: ['out'],
      parameters: [
        { index: 0, type: 'link', value: 'name-in', defaultValue: 'Unknown', guid: 'name-guid' },
        { index: 1, type: 'link', value: 'email-in' },
      ],
    })
  );
  map.pages[0].links.push(
    { ...createSchemaLink('name-in', paths.source.customerName, 'f1'), targetType: 'functoid', targetPath: undefined },
    { ...createSchemaLink('email-in', paths.source.customerEmail, 'f1'), targetType: 'functoid', targetPath: undefined },
    { ...createSchemaLink('out', 'f1', paths.target.billToName), sourceType: 'functoid', sourcePath: undefined }
  );
  return map;
}

test.describe('additional UI interactions', () => {
  for (const { name, className, theme } of [
    { name: 'light', className: 'vscode-light', theme: webLightTheme },
    { name: 'dark', className: 'vscode-dark', theme: webDarkTheme },
    { name: 'high contrast', className: 'vscode-high-contrast vscode-dark', theme: teamsHighContrastTheme },
  ]) {
    test(`host theme ${name} applies Fluent tokens and preserves toolbar interaction`, async ({ mapper }) => {
      await mapper.open();
      const { ui, host } = mapper;
      await ui.page.evaluate((value) => {
        document.body.className = value;
      }, className);
      await host.send({ type: 'init', data: createInitPayload() });
      await expect
        .poll(() =>
          ui.validateButton.evaluate((button) => {
            const provider = button.closest('.fui-FluentProvider');
            return provider ? getComputedStyle(provider).getPropertyValue('--colorNeutralBackground1').trim() : null;
          })
        )
        .toBe(theme.colorNeutralBackground1);
      const compile = host.waitForNext('compile');
      await ui.validateButton.click();
      expect((await compile).data.name).toBe('OrderToInvoice');
      expect(host.messages('update')).toHaveLength(0);
    });

    for (const viewport of [
      { width: 1600, height: 900 },
      { width: 640, height: 480 },
    ]) {
      test(`functoid dialog fits linked inputs and themes fallbacks in ${name} at ${viewport.width}px`, async ({ mapper }) => {
        await mapper.ui.page.setViewportSize(viewport);
        const map = linkedFunctoidMap();
        map.pages[0].links[0].sourcePath = `${paths.source.customerName}/CustomerAccountBillingAndDeliveryInstructionsForInternationalOrders`;
        await mapper.open({ map });
        const { ui, host } = mapper;
        await ui.page.evaluate(
          ({ className, background, foreground }) => {
            document.body.className = className;
            document.documentElement.style.setProperty('--vscode-editor-background', background);
            document.documentElement.style.setProperty('--vscode-foreground', foreground);
          },
          { className, background: theme.colorNeutralBackground1, foreground: theme.colorNeutralForeground1 }
        );
        await ui.functoidNode().dblclick();
        const dialog = ui.page.getByRole('dialog');
        expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
        await expect(dialog.getByRole('button', { name: 'OK', exact: true })).toBeInViewport();
        await expect(dialog.getByRole('button', { name: 'Cancel', exact: true })).toBeInViewport();
        const fallback = dialog.getByRole('textbox', { name: 'Fallback value for input 1', exact: true });
        const colors = await fallback.evaluate(
          (element, expected) => {
            const reference = document.createElement('span');
            reference.style.backgroundColor = expected.background;
            reference.style.color = expected.foreground;
            const control = element.closest('.fui-Input');
            return {
              background: control ? getComputedStyle(control).backgroundColor : null,
              foreground: getComputedStyle(element).color,
              expectedBackground: reference.style.backgroundColor,
              expectedForeground: reference.style.color,
            };
          },
          { background: theme.colorNeutralBackground1, foreground: theme.colorNeutralForeground1 }
        );
        expect(colors.background).toBe(colors.expectedBackground);
        expect(colors.foreground).toBe(colors.expectedForeground);
        for (const input of await dialog.getByRole('textbox', { name: /Fallback value for input/ }).all()) {
          expect(
            await input.evaluate((element) => {
              const row = element.closest('li')!.getBoundingClientRect();
              const field = element.getBoundingClientRect();
              return field.bottom < row.bottom && field.right <= row.right && field.left >= row.left;
            })
          ).toBe(true);
        }
        expect(
          await dialog
            .locator('[data-functoid-input]')
            .evaluateAll((rows) =>
              rows.every((row, index) => index === 0 || row.getBoundingClientRect().top >= rows[index - 1].getBoundingClientRect().bottom)
            )
        ).toBe(true);
        const content = dialog.locator('[data-functoid-panel="inputs"]');
        await expect(dialog.locator('.fui-DialogContent')).toHaveCSS('overflow-y', 'hidden');
        if (viewport.height === 900) {
          expect(await content.evaluate((element) => element.scrollHeight <= element.clientHeight + 1)).toBe(true);
        }
        for (let index = 0; index < 3; index++) {
          await dialog.getByRole('button', { name: 'Add input', exact: true }).click();
        }
        if (viewport.height === 480) {
          expect(await content.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true);
          await expect(content).toHaveCSS('overflow-y', 'auto');
          expect(await content.evaluate((element) => element.offsetWidth - element.clientWidth)).toBeGreaterThan(0);
        }
        const lastInput = dialog.getByRole('textbox', { name: 'Value for input 5', exact: true });
        const description = dialog.locator('.fui-DialogContent > div').first();
        const descriptionBefore = await description.boundingBox();
        const tabsBefore = await dialog.getByRole('tablist').boundingBox();
        await lastInput.fill('visible-last-input');
        await expect(lastInput).toBeInViewport();
        expect(await description.boundingBox()).toEqual(descriptionBefore);
        expect(await dialog.getByRole('tablist').boundingBox()).toEqual(tabsBefore);
        expect(await dialog.locator('.fui-DialogContent').evaluate((element) => element.scrollTop)).toBe(0);
        if (viewport.height === 480) {
          expect(await content.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
        }
        await expect(dialog.getByRole('button', { name: 'OK', exact: true })).toBeInViewport();
        await dialog.screenshot({ path: test.info().outputPath('functoid-dialog-layout.png') });
        await dialog.getByRole('button', { name: 'OK', exact: true }).click();
        expect(host.lastUpdatedMap()!.pages[0].functoids[0].parameters[4].value).toBe('visible-last-input');
      });
    }
  }

  for (const side of ['source', 'target'] as const) {
    test(`Escape dismisses ${side} node properties and permits reopening without editing the map`, async ({ mapper }) => {
      await mapper.open();
      const { ui, host } = mapper;
      const nodePath = side === 'source' ? paths.source.orderId : paths.target.invoiceId;
      await ui.treeNode(side, nodePath).dblclick();
      const dialog = ui.page.getByRole('dialog');
      await expect(dialog).toContainText(nodePath);
      await ui.page.keyboard.press('Escape');
      await expect(dialog).toHaveCount(0);
      await ui.treeNode(side, nodePath).dblclick();
      await expect(dialog).toContainText(nodePath);
      await dialog.getByRole('button', { name: 'Close', exact: true }).click();
      await expect(dialog).toHaveCount(0);
      expect(host.messages('update')).toHaveLength(0);
    });
  }

  test('toolbar commands remain disabled until the host initializes the map', async ({ mapper }) => {
    await mapper.loadWithoutInit();
    const { ui, host } = mapper;

    for (const button of [ui.validateButton, ui.testMapButton, ui.deployButton, ui.copilotButton]) {
      await expect(button).toBeDisabled();
    }
    expect(host.received.map((message) => message.type)).toEqual(['ready']);

    await host.send({ type: 'init', data: createInitPayload() });
    await ui.waitUntilReady();
    for (const button of [ui.validateButton, ui.testMapButton, ui.deployButton, ui.copilotButton]) {
      await expect(button).toBeEnabled();
    }
  });

  test('deploy sends the current edited map without compiling or running it', async ({ mapper }) => {
    await mapper.open();
    const { ui, host } = mapper;
    await ui.connectSchemaNodes(paths.source.orderId, paths.target.invoiceId);
    await expect(ui.links).toHaveCount(1);
    const editedMap = host.lastUpdatedMap();
    const deploy = host.waitForNext('deployToLogicApps');

    await ui.deployButton.click();

    expect((await deploy).data).toEqual(editedMap);
    expect(host.messages('compile')).toHaveLength(0);
    expect(host.messages('testMapWithInput')).toHaveLength(0);
  });

  test('zoom out stops at ten percent and reset restores one hundred percent without editing the map', async ({ mapper }) => {
    await mapper.open();
    const { ui, host } = mapper;
    const out = ui.page.getByTitle('Zoom Out', { exact: true });
    const zoom = ui.page.locator('[data-zoom]');

    for (let step = 0; step < 10; step++) {
      if (await out.isEnabled()) {
        await out.click();
      }
    }
    await expect(zoom).toHaveText('10%');
    await expect(out).toBeDisabled();
    await ui.page.getByTitle('Reset Zoom', { exact: true }).click();
    await expect(zoom).toHaveText('100%');
    await expect(out).toBeEnabled();
    expect(host.messages('update')).toHaveLength(0);
  });

  test('zoom in stops at two hundred percent and reset restores the rendered functoid scale', async ({ mapper }) => {
    const map = createMap();
    map.pages[0].functoids.push(createMapFunctoid('f1'));
    await mapper.open({ map });
    const { ui, host } = mapper;
    const zoomIn = ui.page.getByTitle('Zoom In', { exact: true });
    await ui.page.getByTitle('Reset Zoom', { exact: true }).click();

    for (let step = 0; step < 10; step++) {
      await zoomIn.click();
    }
    await expect(ui.page.locator('[data-zoom]')).toHaveText('200%');
    await expect(zoomIn).toBeDisabled();
    await expect(ui.functoidNode()).toHaveAttribute('transform', /scale\(2\)/);
    await ui.page.getByTitle('Reset Zoom', { exact: true }).click();
    await expect(ui.functoidNode()).toHaveAttribute('transform', /scale\(1\)/);
    expect(host.messages('update')).toHaveLength(0);
  });

  test('Fit is disabled on an empty page', async ({ mapper }) => {
    await mapper.open();
    await expect(mapper.ui.page.getByRole('button', { name: 'Fit', exact: true })).toBeDisabled();
    expect(mapper.host.messages('update')).toHaveLength(0);
  });

  test('Fit separates overlapping functoids and persists their positions without losing links', async ({ mapper }) => {
    const map = linkedFunctoidMap();
    map.pages[0].functoids.push(createMapFunctoid('f2'));
    await mapper.open({ map });
    const { ui, host } = mapper;
    const update = host.waitForNext('update');

    await ui.page.getByRole('button', { name: 'Fit', exact: true }).click();

    const saved = (await update).data.pages[0];
    expect(saved.links).toEqual(map.pages[0].links);
    expect(saved.functoids.map((functoid) => functoid.id)).toEqual(['f1', 'f2']);
    const [first, second] = saved.functoids;
    expect(Math.abs(first.x - second.x) >= 40 || Math.abs(first.y - second.y) >= 30).toBe(true);
    const [firstBox, secondBox] = await Promise.all([ui.functoidNode(0).boundingBox(), ui.functoidNode(1).boundingBox()]);
    expect(firstBox).not.toBeNull();
    expect(secondBox).not.toBeNull();
    expect(
      firstBox!.x + firstBox!.width <= secondBox!.x ||
        secondBox!.x + secondBox!.width <= firstBox!.x ||
        firstBox!.y + firstBox!.height <= secondBox!.y ||
        secondBox!.y + secondBox!.height <= firstBox!.y
    ).toBe(true);
  });

  test('Fit orders a branching graph without overlapping cycle or isolated functoids and preserves configuration', async ({ mapper }) => {
    const map = createMap();
    const edges = [
      ['f1', 'f2'],
      ['f2', 'f3'],
      ['f2', 'f4'],
      ['f3', 'f5'],
      ['f4', 'f5'],
      ['f6', 'f7'],
      ['f7', 'f6'],
    ];
    map.pages[0].links.push(
      { ...createSchemaLink('source-anchor', paths.source.orderId, 'f1'), targetType: 'functoid', targetPath: undefined },
      ...edges.map(([sourceId, targetId], index) => ({
        id: `dependency-${index}`,
        sourceId,
        targetId,
        sourceType: 'functoid' as const,
        targetType: 'functoid' as const,
      })),
      { ...createSchemaLink('target-anchor', 'f5', paths.target.invoiceId), sourceType: 'functoid', sourcePath: undefined }
    );
    for (let index = 1; index <= 8; index++) {
      const id = `f${index}`;
      map.pages[0].functoids.push(
        createMapFunctoid(id, {
          label: `Preserved ${id}`,
          comments: 'Layout changes coordinates only',
          inputLinks: map.pages[0].links.filter((link) => link.targetId === id).map((link) => link.id),
          outputLinks: map.pages[0].links.filter((link) => link.sourceId === id).map((link) => link.id),
        })
      );
    }
    await mapper.open({ map });
    const { ui, host } = mapper;
    await expect(ui.links).toHaveCount(map.pages[0].links.length);
    const updated = host.waitForNext('update');
    await ui.page.getByRole('button', { name: 'Fit', exact: true }).click();
    const saved = (await updated).data.pages[0];
    expect(saved.links).toEqual(map.pages[0].links);
    expect(saved.functoids.map(({ x: _x, y: _y, ...configuration }) => configuration)).toEqual(
      map.pages[0].functoids.map(({ x: _x, y: _y, ...configuration }) => configuration)
    );
    const positions = new Map(saved.functoids.map((functoid) => [functoid.id, { x: functoid.x, y: functoid.y }]));
    for (const [sourceId, targetId] of edges.slice(0, 5)) {
      expect(positions.get(sourceId)!.x).toBeLessThan(positions.get(targetId)!.x);
    }
    for (const functoid of saved.functoids) {
      expect(Number.isFinite(functoid.x) && Number.isFinite(functoid.y)).toBe(true);
    }
    await expect(ui.functoidNodes).toHaveCount(8);
    await expect
      .poll(() =>
        ui.functoidNodes.locator('.functoid-body').evaluateAll((bodies) => {
          const bounds = bodies.map((body) => body.getBoundingClientRect());
          return (
            bounds.length === 8 &&
            bounds.every(
              (first, index) =>
                first.width > 0 &&
                first.height > 0 &&
                bounds
                  .slice(index + 1)
                  .every(
                    (second) =>
                      first.right <= second.left || second.right <= first.left || first.bottom <= second.top || second.bottom <= first.top
                  )
            )
          );
        })
      )
      .toBe(true);
    await expect(ui.links).toHaveCount(saved.links.length);
    expect(host.messages('update')).toHaveLength(1);
  });

  test('context menu disables selection and clipboard commands when nothing is selected', async ({ mapper }) => {
    await mapper.open();
    const { ui, host } = mapper;
    await openContextMenu(ui);

    for (const name of [/Cut/, /Copy/, /Paste/, /Delete/]) {
      await expect(ui.page.getByRole('menuitem', { name })).toBeDisabled();
    }
    await expect(ui.page.getByRole('menuitem', { name: /Auto-Link by Name/ })).toBeEnabled();
    await expect(ui.page.getByRole('menuitem', { name: /Validate Map/ })).toBeEnabled();
    await ui.validateButton.click();
    await expect(ui.page.getByRole('menu')).toBeHidden();
    expect(host.messages('update')).toHaveLength(0);
  });

  test('context menu copies and pastes a functoid with a unique identity and offset', async ({ mapper }) => {
    const map = createMap();
    map.pages[0].functoids.push(
      createMapFunctoid('f1', { label: 'Reusable', parameters: [{ index: 0, type: 'constant', value: 'Hello' }] })
    );
    await mapper.open({ map });
    const { ui, host } = mapper;
    await ui.functoidNode().click();
    await expect(ui.functoidNode().locator('.functoid-body')).toHaveAttribute('stroke', '#007fd4');
    await openContextMenu(ui);
    await ui.page.getByRole('menuitem', { name: /Copy/ }).click();
    await expect(ui.toolbarStatus).toHaveText('Copied functoid');
    expect(host.messages('update')).toHaveLength(0);
    await openContextMenu(ui);
    await ui.page.getByRole('menuitem', { name: /Paste/ }).click();

    await expect(ui.functoidNodes).toHaveCount(2);
    const [original, pasted] = host.lastUpdatedMap()!.pages[0].functoids;
    expect(pasted.id).not.toBe(original.id);
    expect(pasted).toMatchObject({ x: original.x + 30, y: original.y + 30, label: 'Reusable', parameters: original.parameters });
    expect(host.lastUpdatedMap()!.pages[0].links).toEqual([]);
  });

  test('context menu Delete removes a selected functoid and all of its incident links', async ({ mapper }) => {
    await mapper.open({ map: linkedFunctoidMap() });
    const { ui, host } = mapper;
    await ui.functoidNode().click();
    await expect(ui.functoidNode().locator('.functoid-body')).toHaveAttribute('stroke', '#007fd4');
    await openContextMenu(ui);
    await ui.page.getByRole('menuitem', { name: /Delete/ }).click();

    await expect(ui.functoidNodes).toHaveCount(0);
    await expect(ui.links).toHaveCount(0);
    expect(host.lastUpdatedMap()!.pages[0]).toMatchObject({ functoids: [], links: [] });
  });

  test('context menu Cut removes the selection and Paste restores its configuration with a new identity', async ({ mapper }) => {
    const map = createMap();
    map.pages[0].functoids.push(createMapFunctoid('f1', { comments: 'Keep this comment' }));
    await mapper.open({ map });
    const { ui, host } = mapper;
    await ui.functoidNode().click();
    await expect(ui.functoidNode().locator('.functoid-body')).toHaveAttribute('stroke', '#007fd4');
    await openContextMenu(ui);
    await ui.page.getByRole('menuitem', { name: /Cut/ }).click();
    await expect(ui.functoidNodes).toHaveCount(0);
    await openContextMenu(ui);
    await ui.page.getByRole('menuitem', { name: /Paste/ }).click();

    await expect(ui.functoidNodes).toHaveCount(1);
    const [pasted] = host.lastUpdatedMap()!.pages[0].functoids;
    expect(pasted.id).not.toBe('f1');
    expect(pasted.comments).toBe('Keep this comment');
    expect(host.messages('update')).toHaveLength(2);
  });

  test('context menu Auto-Link matches leaf names and does not duplicate existing links', async ({ mapper }) => {
    await mapper.open();
    const { ui, host } = mapper;
    await openContextMenu(ui);
    await ui.page.getByRole('menuitem', { name: /Auto-Link by Name/ }).click();
    await expect(ui.links).toHaveCount(1);
    expect(host.lastUpdatedMap()!.pages[0].links).toEqual([
      expect.objectContaining({ sourcePath: paths.source.customerEmail, targetPath: paths.target.billToEmail }),
    ]);
    await openContextMenu(ui);
    await ui.page.getByRole('menuitem', { name: /Auto-Link by Name/ }).click();

    await expect(ui.links).toHaveCount(1);
    expect(host.messages('update')).toHaveLength(1);
  });

  test('context menu Validate Map reports success without invoking compilation', async ({ mapper }) => {
    await mapper.open();
    const { ui, host } = mapper;
    await openContextMenu(ui);
    await ui.page.getByRole('menuitem', { name: /Validate Map/ }).click();

    await expect(ui.notification).toContainText('Map is valid');
    expect(host.messages('compile')).toHaveLength(0);
    expect(host.messages('update')).toHaveLength(0);
  });

  test('context menu Validate Map reports disconnected functoids without invoking compilation', async ({ mapper }) => {
    const map = createMap();
    map.pages[0].functoids.push(createMapFunctoid('f1'));
    await mapper.open({ map });
    const { ui, host } = mapper;
    await openContextMenu(ui);
    await ui.page.getByRole('menuitem', { name: /Validate Map/ }).click();

    await expect(ui.notification).toContainText('1 error(s), 0 warning(s)');
    await expect(ui.notification).toContainText('not connected');
    expect(host.messages('compile')).toHaveLength(0);
    expect(host.messages('update')).toHaveLength(0);
  });

  test('bottom panel tabs expand the panel and preserve manually entered XML through collapse and tab switches', async ({ mapper }) => {
    await mapper.open();
    const { ui, host } = mapper;
    await expect(ui.bottomPanel).toHaveClass(/collapsed/);
    await ui.page.getByRole('button', { name: /Input Instance/ }).click();
    await expect(ui.bottomPanel).not.toHaveClass(/collapsed/);
    await ui.instanceEditor.fill('<Order><OrderId>manual</OrderId></Order>');
    await ui.page.getByRole('button', { name: /Test Output/ }).click();
    await expect(ui.testOutput).toBeVisible();
    await expect(ui.instanceEditor).toBeHidden();
    await ui.bottomPanel.getByRole('button', { name: '\u25bc', exact: true }).click();
    await expect(ui.bottomPanel).toHaveClass(/collapsed/);
    await ui.page.getByRole('button', { name: /Input Instance/ }).click();

    await expect(ui.instanceEditor).toBeVisible();
    await expect(ui.instanceEditor).toHaveValue('<Order><OrderId>manual</OrderId></Order>');
    expect(host.messages('update')).toHaveLength(0);
  });

  test('Generate Instance populates input without automatically running a transform', async ({ mapper }) => {
    await mapper.open();
    const { ui, host } = mapper;
    const generate = host.waitForNext('generateInstance');
    await ui.bottomPanel.getByRole('button', { name: 'Generate Instance', exact: true }).click();
    expect((await generate).side).toBe('source');
    await host.send({ type: 'instanceGenerated', data: { side: 'source', xml: '<Order><OrderId>generated</OrderId></Order>' } });

    await expect(ui.bottomPanel).not.toHaveClass(/collapsed/);
    await expect(ui.instanceEditor).toBeVisible();
    await expect(ui.instanceEditor).toHaveValue('<Order><OrderId>generated</OrderId></Order>');
    expect(host.messages('testMapWithInput')).toHaveLength(0);
    expect(host.messages('update')).toHaveLength(0);
  });

  test('bottom panel Test Map sends trimmed manual input without requesting generation', async ({ mapper }) => {
    await mapper.open();
    const { ui, host } = mapper;
    await ui.page.getByRole('button', { name: /Input Instance/ }).click();
    await ui.instanceEditor.fill('  <Order><OrderId>42</OrderId></Order>\n');
    const transform = host.waitForNext('testMapWithInput');
    await ui.bottomPanel.getByRole('button', { name: /Test Map/ }).click();

    expect((await transform).data).toMatchObject({ inputXml: '<Order><OrderId>42</OrderId></Order>', map: { name: 'OrderToInvoice' } });
    expect(host.messages('generateInstance')).toHaveLength(0);
    await expect(ui.testOutput).toBeVisible();
    await host.send({ type: 'testMapResult', data: { output: '<Invoice/>' } });
    await expect(ui.testOutput).toHaveText('<Invoice/>');
    await ui.page.getByRole('button', { name: /Input Instance/ }).click();
    await expect(ui.instanceEditor).toHaveValue('  <Order><OrderId>42</OrderId></Order>\n');
  });

  test('linked inputs retain fallback values and link identities after reorder and reopen', async ({ mapper }) => {
    const map = linkedFunctoidMap();
    await mapper.open({ map });
    const { ui, host } = mapper;
    await ui.functoidNode().dblclick();
    const dialog = ui.page.getByRole('dialog');
    await expect(dialog.getByRole('textbox', { name: 'Fallback value for input 1', exact: true })).toHaveValue('Unknown');
    await expect(dialog.locator('[data-input-action="up"][data-index="0"]')).toBeDisabled();
    await expect(dialog.locator('[data-input-action="down"][data-index="1"]')).toBeDisabled();
    await expect(dialog.locator('[data-input-action="remove"]')).toHaveCount(0);
    await dialog.getByRole('textbox', { name: 'Fallback value for input 2', exact: true }).fill('no-email');
    await dialog.locator('[data-input-action="up"][data-index="1"]').click();
    await expect(dialog.getByRole('textbox', { name: 'Fallback value for input 1', exact: true })).toHaveValue('no-email');
    await dialog.getByRole('tab', { name: 'Outputs', exact: true }).click();
    await expect(dialog.locator('[data-functoid-panel="output"]')).toContainText(`Target: ${paths.target.billToName}`);
    await dialog.getByRole('button', { name: 'OK', exact: true }).click();
    await expect(dialog).toHaveCount(0);

    const saved = host.lastUpdatedMap()!.pages[0];
    expect(saved.functoids[0].inputLinks).toEqual(['email-in', 'name-in']);
    expect(saved.functoids[0].parameters).toEqual([
      { index: 0, type: 'link', value: 'email-in', defaultValue: 'no-email' },
      { index: 1, type: 'link', value: 'name-in', defaultValue: 'Unknown', guid: 'name-guid' },
    ]);
    expect(saved.links).toEqual(map.pages[0].links);
    await ui.functoidNode().dblclick();
    await expect(dialog.locator('[data-functoid-input]').first()).toContainText(paths.source.customerEmail);
    await expect(dialog.getByRole('textbox', { name: 'Fallback value for input 2', exact: true })).toHaveValue('Unknown');
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  });

  test('cancelling linked-input fallback and reorder edits leaves the original map untouched', async ({ mapper }) => {
    await mapper.open({ map: linkedFunctoidMap() });
    const { ui, host } = mapper;
    await ui.functoidNode().dblclick();
    const dialog = ui.page.getByRole('dialog');
    await dialog.getByRole('textbox', { name: 'Fallback value for input 1', exact: true }).fill('Discard');
    await dialog.locator('[data-input-action="down"][data-index="0"]').click();
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    expect(host.messages('update')).toHaveLength(0);
    await ui.functoidNode().dblclick();
    await expect(dialog.locator('[data-functoid-input]').first()).toContainText(paths.source.customerName);
    await expect(dialog.getByRole('textbox', { name: 'Fallback value for input 1', exact: true })).toHaveValue('Unknown');
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  });
});
