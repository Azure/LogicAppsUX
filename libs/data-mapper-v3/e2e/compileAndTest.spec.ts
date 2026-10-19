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

    await expect(ui.notification).toContainText('Validation failed');
    await expect(ui.notification).toContainText('not connected');
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
});
