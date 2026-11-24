import { expect, test } from './fixtures/mapperHost';
import { createMap, createMapFunctoid, createSchemaLink, paths } from './fixtures/testData';

function validMap() {
  const map = createMap();
  map.pages[0].links.push(createSchemaLink('link-1', paths.source.orderId, paths.target.invoiceId));
  return map;
}

test.describe('validate, compile and test map @p0', () => {
  test('validating a map with a disconnected functoid reports an error and does not compile', async ({ mapper }) => {
    const map = validMap();
    map.pages[0].functoids.push(createMapFunctoid('f1'));
    await mapper.open({ map });
    const { ui, host } = mapper;

    await ui.validateButton.click();

    await expect(ui.notification).toContainText('Validation failed: 1 error(s), 0 warning(s) \u2014 compilation aborted');
    await expect(ui.notification).toContainText('\u2717 Functoid "String Concatenate" (f1): not connected \u2014 no input or output links');
    expect(host.messages('compile')).toHaveLength(0);
  });

  test('validating a valid map posts compile with the current map', async ({ mapper }) => {
    await mapper.open({ map: validMap() });
    const { ui, host } = mapper;

    const posted = host.waitForNext('compile');
    await ui.validateButton.click();

    const message = await posted;
    expect(message.data.name).toBe('OrderToInvoice');
    expect(message.data.pages[0].links).toHaveLength(1);
  });

  test('a successful compileResult shows a success notification', async ({ mapper }) => {
    await mapper.open({ map: validMap() });
    const { ui, host } = mapper;

    await host.send({ type: 'compileResult', data: { success: true, xslt: '<xsl:stylesheet/>', errors: [], warnings: [] } });

    await expect(ui.notification).toContainText('Compiled');
  });

  test('a failed compileResult lists the compiler errors', async ({ mapper }) => {
    await mapper.open({ map: validMap() });
    const { ui, host } = mapper;

    await host.send({ type: 'compileResult', data: { success: false, errors: [{ message: 'Unbound prefix ns0' }], warnings: [] } });

    await expect(ui.notification).toContainText('Compilation failed');
    await expect(ui.notification).toContainText('Unbound prefix ns0');
  });

  test('the host executeCompile command runs the same validate-and-compile flow', async ({ mapper }) => {
    await mapper.open({ map: validMap() });
    const { host } = mapper;

    const posted = host.waitForNext('compile');
    await host.send({ type: 'executeCompile', data: {} });

    await posted;
  });

  test('Test Map generates an instance, runs the transform with it and shows the output', async ({ mapper }) => {
    await mapper.open({ map: validMap() });
    const { ui, host } = mapper;

    const generate = host.waitForNext('generateInstance');
    await ui.testMapButton.click();
    expect((await generate).side).toBe('source');

    const transform = host.waitForNext('testMapWithInput');
    await host.send({ type: 'instanceGenerated', data: { side: 'source', xml: '<Order><OrderId>1</OrderId></Order>' } });
    const message = await transform;
    expect(message.data.inputXml).toBe('<Order><OrderId>1</OrderId></Order>');
    expect(message.data.map.name).toBe('OrderToInvoice');

    await host.send({ type: 'testMapResult', data: { output: '<Invoice><InvoiceId>1</InvoiceId></Invoice>' } });
    await expect(ui.testOutput).toHaveText('<Invoice><InvoiceId>1</InvoiceId></Invoice>');
    await expect(ui.instanceEditor).toHaveValue('<Order><OrderId>1</OrderId></Order>');
  });

  test('a transform error is shown in the output pane', async ({ mapper }) => {
    await mapper.open({ map: validMap() });
    const { ui, host } = mapper;

    const generate = host.waitForNext('generateInstance');
    await ui.testMapButton.click();
    await generate;
    await host.send({ type: 'instanceGenerated', data: { side: 'source', xml: '<Order/>' } });
    await host.send({ type: 'testMapResult', data: { output: '', error: 'XSLT failed' } });

    await expect(ui.testOutput).toHaveText('Error: XSLT failed');
  });

  test('Test Map reuses instance XML that is already in the input editor', async ({ mapper }) => {
    await mapper.open({ map: validMap() });
    const { ui, host } = mapper;
    const generate = host.waitForNext('generateInstance');
    await ui.testMapButton.click();
    await generate;
    const firstTransform = host.waitForNext('testMapWithInput');
    await host.send({ type: 'instanceGenerated', data: { side: 'source', xml: '<Order/>' } });
    await firstTransform;
    host.clear();

    const transform = host.waitForNext('testMapWithInput');
    await ui.testMapButton.click();

    expect((await transform).data.inputXml).toBe('<Order/>');
    expect(host.messages('generateInstance')).toHaveLength(0);
  });

  test('the host executeTestMap command starts the Test Map flow', async ({ mapper }) => {
    await mapper.open({ map: validMap() });
    const { host } = mapper;

    const posted = host.waitForNext('generateInstance');
    await host.send({ type: 'executeTestMap', data: {} });

    expect((await posted).side).toBe('source');
  });

  for (const missing of ['source', 'target', 'both'] as const) {
    test(`missing ${missing} schema blocks compilation with exact validation errors`, async ({ mapper }) => {
      await mapper.open({
        map: validMap(),
        ...(missing !== 'target' ? { sourceSchema: null } : {}),
        ...(missing !== 'source' ? { targetSchema: null } : {}),
      });
      const { ui, host } = mapper;
      await ui.validateButton.click();

      await expect(ui.notification).toContainText(
        `Validation failed: ${missing === 'both' ? 2 : 1} error(s), 0 warning(s) \u2014 compilation aborted`
      );
      if (missing !== 'target') {
        await expect(ui.notification).toContainText('\u2717 No source schema loaded');
      }
      if (missing !== 'source') {
        await expect(ui.notification).toContainText('\u2717 No target schema loaded');
      }
      expect(host.messages('compile')).toHaveLength(0);
      expect(host.messages('update')).toHaveLength(0);
    });
  }

  for (const warning of ['missing endpoint', 'no input links', 'no output link'] as const) {
    test(`${warning} shows the exact warning but still compiles`, async ({ mapper }) => {
      const map = createMap();
      let detail: string;
      if (warning === 'missing endpoint') {
        map.pages[0].links.push(createSchemaLink('broken', '', paths.target.invoiceId));
        detail = '\u26a0 Link broken: missing endpoint';
      } else {
        map.pages[0].functoids.push(createMapFunctoid('f1'));
        if (warning === 'no input links') {
          map.pages[0].links.push({
            ...createSchemaLink('output', 'f1', paths.target.billToName),
            sourceType: 'functoid' as never,
            sourcePath: undefined,
          });
          detail = '\u26a0 Functoid "String Concatenate" (f1): no input links';
        } else {
          map.pages[0].links.push({
            ...createSchemaLink('input', paths.source.customerName, 'f1'),
            targetType: 'functoid' as never,
            targetPath: undefined,
          });
          detail = '\u26a0 Functoid "String Concatenate" (f1): no output link \u2014 result is not connected to target';
        }
      }
      await mapper.open({ map });
      const { ui, host } = mapper;
      const compiled = host.waitForNext('compile');
      await ui.validateButton.click();

      expect((await compiled).data.pages[0].links).toEqual(map.pages[0].links);
      await expect(ui.notification).toContainText('Validation: 1 warning(s) \u2014 compiling...');
      await expect(ui.notification).toContainText(detail);
      expect(host.messages('compile')).toHaveLength(1);
      expect(host.messages('update')).toHaveLength(0);
    });
  }

  for (const name of ['Date', 'Time', 'Date and Time', 'Iteration', 'Scripting']) {
    test(`${name} compiles with an output link and no input warning`, async ({ mapper }) => {
      const map = createMap();
      map.pages[0].functoids.push(createMapFunctoid('f1', { name }));
      map.pages[0].links.push({
        ...createSchemaLink('output', 'f1', paths.target.billToName),
        sourceType: 'functoid' as never,
        sourcePath: undefined,
      });
      await mapper.open({ map });
      const { ui, host } = mapper;
      const compiled = host.waitForNext('compile');
      await ui.validateButton.click();
      await compiled;

      await expect(ui.notification).toBeHidden();
      expect(host.messages('compile')).toHaveLength(1);
    });
  }

  test('failed instance generation shows the exact error and permits a successful retry', async ({ mapper }) => {
    await mapper.open({ map: validMap() });
    const { ui, host } = mapper;
    const generated = host.waitForNext('generateInstance');
    await ui.testMapButton.click();
    await generated;
    await host.send({ type: 'instanceGenerated', data: { side: 'source', xml: '', error: 'No source schema loaded' } });

    await expect(ui.instanceEditor).toHaveValue('No source schema loaded');
    expect(host.messages('testMapWithInput')).toHaveLength(0);
    await ui.instanceEditor.selectText();
    await ui.instanceEditor.press('Backspace');
    const retry = host.waitForNext('generateInstance');
    await ui.testMapButton.click();
    await retry;
    const transformed = host.waitForNext('testMapWithInput');
    await host.send({ type: 'instanceGenerated', data: { side: 'source', xml: '<Order/>' } });

    expect((await transformed).data.inputXml).toBe('<Order/>');
    expect(host.messages('testMapWithInput')).toHaveLength(1);
  });

  for (const error of [
    'Input validation failed: XML is not well-formed.\nUnexpected closing tag',
    'Compilation failed:\nUnbound prefix ns0',
    'No target schema loaded',
  ]) {
    test(`shows the complete transform error: ${error.split('\n')[0]}`, async ({ mapper }) => {
      await mapper.open({ map: validMap() });
      const { ui, host } = mapper;
      await host.send({ type: 'testMapResult', data: { output: '', error } });

      await expect(ui.testOutput).toHaveJSProperty('textContent', `Error: ${error}`);
      expect(host.messages('update')).toHaveLength(0);
    });
  }

  test('shows every compiler error without replacing it with a generic failure', async ({ mapper }) => {
    await mapper.open({ map: validMap() });
    const { ui, host } = mapper;
    await host.send({
      type: 'compileResult',
      data: { success: false, errors: [{ message: 'Unbound prefix ns0' }, { message: 'Missing target root' }], warnings: [] },
    });

    await expect(ui.notification).toContainText('Compilation failed');
    await expect.poll(() => ui.notification.textContent()).toContain('Unbound prefix ns0\nMissing target root');
    expect(host.messages('update')).toHaveLength(0);
  });
});
