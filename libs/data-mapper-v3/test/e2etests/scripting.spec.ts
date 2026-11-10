import { expect, test } from './fixtures/mapperHost';
import { createMap, createMapFunctoid } from './fixtures/testData';

function scriptingMap() {
  const map = createMap();
  map.pages[0].functoids.push(
    createMapFunctoid('script-1', {
      functoidId: 600,
      name: 'Scripting',
      category: 'Advanced',
      parameters: [{ index: 0, type: 'constant', value: 'Keep input', guid: 'input-guid' }],
      scriptType: 'inlineCSharp',
      scriptContent: 'public string Original() { return "original"; }',
      scriptImplementations: [
        {
          type: 'inlineCSharp',
          content: 'public string Original() { return "original"; }',
          assemblyReferences: ['System.Xml'],
        },
      ],
    })
  );
  return map;
}

const inlineScripts = [
  { label: 'Inline C#', type: 'inlineCSharp', body: 'public string Convert(string value) { return value.Trim(); }', references: true },
  {
    label: 'Inline VB.NET',
    type: 'inlineVbNet',
    body: 'Public Function Convert(value As String) As String\nReturn value.Trim()\nEnd Function',
    references: true,
  },
  { label: 'Inline JScript', type: 'inlineJScript', body: 'function Convert(value) { return value.toUpperCase(); }', references: true },
  { label: 'Inline XSLT', type: 'inlineXslt', body: '<InvoiceId><xsl:value-of select="OrderId"/></InvoiceId>', references: false },
  {
    label: 'Inline XSLT Call Template',
    type: 'inlineXsltCallTemplate',
    body: '<xsl:template name="Convert"><InvoiceId>42</InvoiceId></xsl:template>',
    references: false,
  },
] as const;

test.describe('scripting configuration', () => {
  for (const script of inlineScripts) {
    test(`${script.label} saves script content and preserves inputs after reopening`, async ({ mapper }) => {
      const map = scriptingMap();
      await mapper.open({ map });
      const { ui, host } = mapper;
      await ui.functoidNode().dblclick();
      const dialog = ui.page.getByRole('dialog');
      await expect(dialog).toContainText('Scripting Functoid Properties');
      await expect(dialog.getByRole('textbox', { name: 'Script', exact: true })).toHaveValue(map.pages[0].functoids[0].scriptContent!);
      await dialog.getByRole('radio', { name: script.label, exact: true }).check();
      await dialog.getByRole('textbox', { name: 'Script', exact: true }).fill(script.body);
      const references = dialog.getByRole('textbox', { name: 'Assembly References', exact: true });
      if (script.references) {
        await references.fill(' System.Xml \nSystem.Core\n\nSystem.Xml\n');
      } else {
        await expect(references).toHaveCount(0);
      }
      await dialog.getByRole('tab', { name: 'Label and Comments', exact: true }).click();
      await dialog.getByRole('textbox', { name: 'Label', exact: true }).fill('Customer script');
      await dialog.getByRole('textbox', { name: 'Comments', exact: true }).fill('Formats customer values\nPreserves inputs');
      const update = host.waitForNext('update');
      await dialog.getByRole('button', { name: 'Save', exact: true }).click();
      const saved = (await update).data.pages[0].functoids[0];

      expect(saved).toMatchObject({
        scriptType: script.type,
        scriptContent: script.body,
        label: 'Customer script',
        comments: 'Formats customer values\nPreserves inputs',
        parameters: map.pages[0].functoids[0].parameters,
      });
      expect(saved.scriptImplementations).toEqual([
        { type: script.type, content: script.body, assemblyReferences: script.references ? ['System.Xml', 'System.Core'] : ['System.Xml'] },
      ]);
      await expect(dialog).toHaveCount(0);
      await expect(ui.notification).toContainText('Scripting functoid updated');
      await ui.functoidNode().dblclick();
      await expect(dialog.getByRole('radio', { name: script.label, exact: true })).toBeChecked();
      await expect(dialog.getByRole('textbox', { name: 'Script', exact: true })).toHaveValue(script.body);
      if (script.references) {
        await expect(references).toHaveValue('System.Xml\nSystem.Core');
      }
      await dialog.getByRole('tab', { name: 'Label and Comments', exact: true }).click();
      await expect(dialog.getByRole('textbox', { name: 'Label', exact: true })).toHaveValue('Customer script');
      await expect(dialog.getByRole('textbox', { name: 'Comments', exact: true })).toHaveValue('Formats customer values\nPreserves inputs');
      await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
      expect(host.messages('update')).toHaveLength(1);
    });
  }

  test('external assembly browse selects classes and methods and persists method metadata', async ({ mapper }) => {
    const map = scriptingMap();
    await mapper.open({ map });
    const { ui, host } = mapper;
    await ui.functoidNode().dblclick();
    const dialog = ui.page.getByRole('dialog');
    await dialog.getByRole('radio', { name: 'External Assembly', exact: true }).check();
    await expect(dialog.getByRole('textbox', { name: 'Script', exact: true })).toHaveCount(0);
    await expect(dialog.getByRole('textbox', { name: 'Assembly References', exact: true })).toHaveCount(0);
    const className = dialog.getByRole('combobox', { name: 'Class Name', exact: true });
    const methodName = dialog.getByRole('combobox', { name: 'Method Name', exact: true });
    await expect(className).toBeDisabled();
    await expect(methodName).toBeDisabled();
    const browse = host.waitForNext('browseAssembly');
    await dialog.getByRole('button', { name: 'Browse...', exact: true }).click();
    await browse;
    expect(host.messages('update')).toHaveLength(0);
    await host.send({
      type: 'assemblySelected',
      data: {
        path: 'C:\\Maps\\Helpers.dll',
        classes: [
          {
            className: 'Helpers.Formatters',
            methods: [
              {
                name: 'Format',
                signature: 'Format(string value)',
                isStatic: true,
                returnType: 'System.String',
                parameterTypes: ['System.String'],
              },
            ],
          },
          {
            className: 'Helpers.Predicates',
            methods: [
              {
                name: 'IsEmpty',
                signature: 'IsEmpty(string value)',
                isStatic: true,
                returnType: 'System.Boolean',
                parameterTypes: ['System.String'],
              },
              {
                name: 'IsPositive',
                signature: 'IsPositive(int value)',
                isStatic: false,
                returnType: 'System.Boolean',
                parameterTypes: ['System.Int32'],
              },
            ],
          },
        ],
      },
    });

    await expect(dialog.getByPlaceholder('Browse to a .NET assembly (DLL)')).toHaveValue('C:\\Maps\\Helpers.dll');
    await expect(className).toContainText('Helpers.Formatters');
    await expect(methodName).toContainText('Format(string value)');
    await className.click();
    await ui.page.getByRole('option', { name: 'Helpers.Predicates', exact: true }).click();
    await expect(methodName).toContainText('IsEmpty(string value)');
    await methodName.click();
    await ui.page.getByRole('option', { name: 'IsPositive(int value) : System.Boolean', exact: true }).click();
    const update = host.waitForNext('update');
    await dialog.getByRole('button', { name: 'Save', exact: true }).click();
    const saved = (await update).data.pages[0].functoids[0];

    expect(saved.scriptType).toBe('externalAssembly');
    expect(saved.scriptContent).toBeUndefined();
    expect(saved.parameters).toEqual(map.pages[0].functoids[0].parameters);
    expect(saved.scriptImplementations).toEqual([
      {
        type: 'externalAssembly',
        assemblyPath: 'C:\\Maps\\Helpers.dll',
        className: 'Helpers.Predicates',
        methodName: 'IsPositive',
        parameterTypes: ['System.Int32'],
        returnType: 'System.Boolean',
        isStatic: false,
      },
    ]);
    await expect(dialog).toHaveCount(0);
    expect(host.messages('update')).toHaveLength(1);
  });

  test('cancelling script edits and an assembly browse discards the entire draft', async ({ mapper }) => {
    const map = scriptingMap();
    await mapper.open({ map });
    const { ui, host } = mapper;
    await ui.functoidNode().dblclick();
    const dialog = ui.page.getByRole('dialog');
    await dialog.getByRole('textbox', { name: 'Script', exact: true }).fill('Discard this script');
    await dialog.getByRole('textbox', { name: 'Assembly References', exact: true }).fill('Discard.dll');
    await dialog.getByRole('radio', { name: 'External Assembly', exact: true }).check();
    const browse = host.waitForNext('browseAssembly');
    await dialog.getByRole('button', { name: 'Browse...', exact: true }).click();
    await browse;
    await host.send({ type: 'assemblySelected', data: { path: 'C:\\Discard.dll', classes: [] } });
    await expect(dialog.getByPlaceholder('Browse to a .NET assembly (DLL)')).toHaveValue('C:\\Discard.dll');
    await dialog.getByRole('tab', { name: 'Label and Comments', exact: true }).click();
    await dialog.getByRole('textbox', { name: 'Label', exact: true }).fill('Discarded label');
    await dialog.getByRole('textbox', { name: 'Comments', exact: true }).fill('Discarded comments');
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    expect(host.messages('update')).toHaveLength(0);

    await ui.functoidNode().dblclick();
    await expect(dialog.getByRole('radio', { name: 'Inline C#', exact: true })).toBeChecked();
    await expect(dialog.getByRole('textbox', { name: 'Script', exact: true })).toHaveValue(map.pages[0].functoids[0].scriptContent!);
    await expect(dialog.getByRole('textbox', { name: 'Assembly References', exact: true })).toHaveValue('System.Xml');
    await dialog.getByRole('tab', { name: 'Label and Comments', exact: true }).click();
    await expect(dialog.getByRole('textbox', { name: 'Label', exact: true })).toHaveValue('');
    await expect(dialog.getByRole('textbox', { name: 'Comments', exact: true })).toHaveValue('');
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    expect(host.messages('update')).toHaveLength(0);
    const deploy = host.waitForNext('deployToLogicApps');
    await ui.deployButton.click();
    expect((await deploy).data).toEqual(map);
  });

  test('regression: reopening external configuration shows the saved class instead of the first browsed class', async ({ mapper }) => {
    await mapper.open({ map: scriptingMap() });
    const { ui, host } = mapper;
    await ui.functoidNode().dblclick();
    const dialog = ui.page.getByRole('dialog');
    await dialog.getByRole('radio', { name: 'External Assembly', exact: true }).check();
    const browse = host.waitForNext('browseAssembly');
    await dialog.getByRole('button', { name: 'Browse...', exact: true }).click();
    await browse;
    await host.send({
      type: 'assemblySelected',
      data: {
        path: 'C:\\Helpers.dll',
        classes: [
          { className: 'Helpers.First', methods: [] },
          { className: 'Helpers.Saved', methods: [] },
        ],
      },
    });
    const className = dialog.getByRole('combobox', { name: 'Class Name', exact: true });
    await expect(className).toContainText('Helpers.First');
    await className.click();
    await ui.page.getByRole('option', { name: 'Helpers.Saved', exact: true }).click();
    const update = host.waitForNext('update');
    await dialog.getByRole('button', { name: 'Save', exact: true }).click();
    expect((await update).data.pages[0].functoids[0].scriptImplementations![0].className).toBe('Helpers.Saved');
    await expect(dialog).toHaveCount(0);
    await ui.functoidNode().dblclick();
    await expect(dialog.getByRole('radio', { name: 'External Assembly', exact: true })).toBeChecked();

    test.fail(true, 'ScriptingConfigDialog retains assemblyUpdate and reapplies the first browsed class over the saved class on reopen.');
    await expect(className).toContainText('Helpers.Saved');
  });

  test('regression: cancelling an assembly browse does not populate a later configuration draft', async ({ mapper }) => {
    await mapper.open({ map: scriptingMap() });
    const { ui, host } = mapper;
    await ui.functoidNode().dblclick();
    const dialog = ui.page.getByRole('dialog');
    await dialog.getByRole('radio', { name: 'External Assembly', exact: true }).check();
    const browse = host.waitForNext('browseAssembly');
    await dialog.getByRole('button', { name: 'Browse...', exact: true }).click();
    await browse;
    await host.send({ type: 'assemblySelected', data: { path: 'C:\\Cancelled.dll', classes: [] } });
    await expect(dialog.getByPlaceholder('Browse to a .NET assembly (DLL)')).toHaveValue('C:\\Cancelled.dll');
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    expect(host.messages('update')).toHaveLength(0);
    await ui.functoidNode().dblclick();
    await dialog.getByRole('radio', { name: 'External Assembly', exact: true }).check();

    test.fail(true, 'ScriptingConfigDialog retains the cancelled assemblyUpdate and applies it to the next draft.');
    await expect(dialog.getByPlaceholder('Browse to a .NET assembly (DLL)')).toHaveValue('');
  });
});
