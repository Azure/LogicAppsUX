import { expect, test } from './fixtures/mapperHost';
import { createMap, createMapFunctoid, createSchemaLink, paths } from './fixtures/testData';

test.describe('assistant controls', () => {
  test('closing and toggling the assistant preserves an unsent prompt', async ({ mapper }) => {
    await mapper.open();
    const { ui, host } = mapper;
    const panel = ui.page.locator('biztalk-copilot-panel');
    const prompt = panel.locator('#copilot-prompt');

    await expect(prompt).toBeHidden();
    await ui.copilotButton.click();
    await expect(prompt).toHaveValue('Take the XSLT file and generate the map.');
    await prompt.fill('Keep this unsent mapping request.');
    await panel.getByRole('button', { name: 'Close Data Mapper Assistant', exact: true }).click();
    await expect(panel).toHaveAttribute('hidden', '');

    await ui.copilotButton.click();
    await expect(prompt).toHaveValue('Keep this unsent mapping request.');
    await ui.copilotButton.click();
    await expect(panel).toHaveAttribute('hidden', '');
    await ui.copilotButton.click();
    await expect(prompt).toHaveValue('Keep this unsent mapping request.');
    expect(host.messages('copilotPrompt')).toEqual([]);
    expect(host.messages('update')).toEqual([]);
  });

  test('regression: closing the assistant hides its rendered controls', async ({ mapper }) => {
    await mapper.open();
    const { ui, host } = mapper;
    const panel = ui.page.locator('biztalk-copilot-panel');
    await ui.copilotButton.click();
    await expect(panel.locator('#copilot-prompt')).toBeVisible();
    await panel.getByRole('button', { name: 'Close Data Mapper Assistant', exact: true }).click();
    await expect(panel).toHaveAttribute('hidden', '');
    expect(host.messages('update')).toEqual([]);

    test.fail(true, 'The styled assistant panel remains visible despite the host element hidden attribute.');
    await expect(panel.locator('#copilot-prompt')).toBeHidden({ timeout: 1_000 });
  });

  for (const method of ['button', 'keyboard'] as const) {
    test(`rejects empty and whitespace-only prompts using the ${method}`, async ({ mapper }) => {
      await mapper.open();
      const { ui, host } = mapper;
      await ui.copilotButton.click();
      const panel = ui.page.locator('biztalk-copilot-panel');
      const prompt = panel.locator('#copilot-prompt');
      const submit = panel.getByRole('button', { name: 'Apply with Assistant', exact: true });

      for (const value of [' \t\n  ', '']) {
        if (value) {
          await prompt.fill(value);
        } else {
          await prompt.press('Control+A');
          await prompt.press('Backspace');
        }
        await expect(prompt).toHaveValue(value);
        if (method === 'button') {
          await submit.click();
        } else {
          await prompt.press('Control+Enter');
        }
        expect(host.messages('copilotPrompt')).toEqual([]);
        await expect(prompt).toBeEnabled();
        await expect(submit).toBeEnabled();
        await expect(panel.locator('.copilot-result')).toHaveCount(0);
      }

      expect(host.messages('copilotPrompt')).toEqual([]);
      expect(host.messages('update')).toEqual([]);
    });
  }

  for (const method of ['button', 'keyboard'] as const) {
    test(`submits a trimmed prompt for the active page using the ${method}`, async ({ mapper }) => {
      const map = createMap();
      map.pages.push({ id: 'customer-page', name: 'Customer details', links: [], functoids: [] });
      map.pages[1].links.push(createSchemaLink('customer-page-link', paths.source.customerName, paths.target.billToName));
      await mapper.open({ map });
      const { ui, host } = mapper;
      await ui.pageTabs.nth(1).click();
      await expect(ui.link('customer-page-link')).toHaveCount(1);
      await expect(ui.statusBar).toContainText('Links: 1');
      await ui.copilotButton.click();
      const panel = ui.page.locator('biztalk-copilot-panel');
      const prompt = panel.locator('#copilot-prompt');
      await prompt.fill('  Connect customer name\nto the invoice name. \n ');

      const posted = host.waitForNext('copilotPrompt');
      if (method === 'button') {
        await panel.getByRole('button', { name: 'Apply with Assistant', exact: true }).click();
      } else {
        await prompt.press('Control+Enter');
      }

      expect(await posted).toEqual({
        type: 'copilotPrompt',
        data: { prompt: 'Connect customer name\nto the invoice name.', activePage: 1 },
      });
      await expect(panel.locator('.copilot-result')).toHaveText('Data Mapper Assistant is preparing a validated map edit…');
      await expect(prompt).toBeDisabled();
      expect(host.messages('copilotPrompt')).toHaveLength(1);
      expect(host.messages('update')).toEqual([]);
    });
  }

  test('browses context, renders host files, removes by ID and clears all', async ({ mapper }) => {
    await mapper.open();
    const { ui, host } = mapper;
    await ui.copilotButton.click();
    const panel = ui.page.locator('biztalk-copilot-panel');
    await expect(panel.getByText('No additional context files', { exact: true })).toBeVisible();
    await expect(panel.getByRole('button', { name: 'Clear all', exact: true })).toHaveCount(0);

    const browse = host.waitForNext('browseCopilotContext');
    await panel.locator('#copilot-add-context').click();
    expect(await browse).toEqual({ type: 'browseCopilotContext' });
    const files = [
      { id: 'file:///workspace/transform.xslt', name: 'transform.xslt', size: 1025 },
      { id: 'file:///workspace/example.xml', name: 'example.xml', size: 512 },
    ];
    await host.send({ type: 'copilotContextChanged', data: { files, message: 'Added 2 context files.' } });
    await expect(panel.locator('.copilot-result')).toHaveText('Added 2 context files.');
    await expect(panel.locator('.copilot-context-file > span')).toHaveText(['transform.xslt', 'example.xml']);
    await expect(panel.locator('.copilot-context-file').nth(0)).toHaveAttribute('title', 'transform.xslt (2 KB)');
    await expect(panel.locator('.copilot-context-file').nth(1)).toHaveAttribute('title', 'example.xml (512 B)');
    await expect(panel.getByText('No additional context files', { exact: true })).toHaveCount(0);

    const removed = host.waitForNext('removeCopilotContext');
    await panel.getByRole('button', { name: 'Remove transform.xslt', exact: true }).click();
    expect(await removed).toEqual({ type: 'removeCopilotContext', data: { id: files[0].id } });
    await host.send({ type: 'copilotContextChanged', data: { files: [files[1]] } });
    await expect(panel.locator('.copilot-context-file > span')).toHaveText(['example.xml']);
    await expect(panel.locator('.copilot-result')).toHaveText('Added 2 context files.');

    const cleared = host.waitForNext('clearCopilotContext');
    await panel.getByRole('button', { name: 'Clear all', exact: true }).click();
    expect(await cleared).toEqual({ type: 'clearCopilotContext' });
    await host.send({ type: 'copilotContextChanged', data: { files: [], message: 'Context files cleared.' } });
    await expect(panel.locator('.copilot-context-file')).toHaveCount(0);
    await expect(panel.getByText('No additional context files', { exact: true })).toBeVisible();
    await expect(panel.getByRole('button', { name: 'Clear all', exact: true })).toHaveCount(0);
    await expect(panel.locator('.copilot-result')).toHaveText('Context files cleared.');
    expect(host.messages('copilotPrompt')).toEqual([]);
    expect(host.messages('update')).toEqual([]);
  });

  test('blocks duplicate submission and context changes while busy, then allows another request', async ({ mapper }) => {
    await mapper.open();
    const { ui, host } = mapper;
    await ui.copilotButton.click();
    const panel = ui.page.locator('biztalk-copilot-panel');
    const prompt = panel.locator('#copilot-prompt');
    await host.send({
      type: 'copilotContextChanged',
      data: { files: [{ id: 'context-1', name: 'transform.xslt', size: 1024 }] },
    });
    await expect(panel.getByRole('button', { name: 'Remove transform.xslt', exact: true })).toBeEnabled();
    await prompt.fill('Map the customer name.');
    const submit = panel.getByRole('button', { name: /^(Apply with Assistant|Working…)$/ });
    const posted = host.waitForNext('copilotPrompt');
    await submit.dblclick();
    await posted;

    await expect(submit).toHaveText('Working…');
    await expect(submit).toBeDisabled();
    await expect(prompt).toBeDisabled();
    await expect(panel.locator('#copilot-add-context')).toBeDisabled();
    await expect(panel.getByRole('button', { name: 'Clear all', exact: true })).toBeDisabled();
    await expect(panel.getByRole('button', { name: 'Remove transform.xslt', exact: true })).toBeDisabled();
    await ui.page.keyboard.press('Control+Enter');
    expect(host.messages('copilotPrompt')).toHaveLength(1);
    expect(host.messages('browseCopilotContext')).toEqual([]);
    expect(host.messages('removeCopilotContext')).toEqual([]);
    expect(host.messages('clearCopilotContext')).toEqual([]);

    await host.send({ type: 'copilotResult', data: { success: true, applied: false, message: 'No changes required.' } });
    await expect(panel.locator('.copilot-result')).toHaveText('No changes required.');
    await expect(prompt).toBeEnabled();
    await expect(panel.locator('#copilot-add-context')).toBeEnabled();
    await expect(panel.getByRole('button', { name: 'Clear all', exact: true })).toBeEnabled();
    await expect(panel.getByRole('button', { name: 'Remove transform.xslt', exact: true })).toBeEnabled();
    await prompt.fill('Map the order identifier instead.');
    const next = host.waitForNext('copilotPrompt');
    await submit.click();
    expect(await next).toEqual({
      type: 'copilotPrompt',
      data: { prompt: 'Map the order identifier instead.', activePage: 0 },
    });
    expect(host.messages('copilotPrompt')).toHaveLength(2);
  });

  test('renders an applied host map and exact success text without echoing an update', async ({ mapper }) => {
    await mapper.open();
    const { ui, host } = mapper;
    await ui.copilotButton.click();
    const panel = ui.page.locator('biztalk-copilot-panel');
    await panel.locator('#copilot-prompt').fill('Connect the order identifier and add a concatenate functoid.');
    const posted = host.waitForNext('copilotPrompt');
    await panel.getByRole('button', { name: 'Apply with Assistant', exact: true }).click();
    await posted;

    const map = createMap();
    map.pages[0].name = 'Assistant mappings';
    map.pages[0].links.push(createSchemaLink('assistant-link', paths.source.orderId, paths.target.invoiceId));
    map.pages[0].functoids.push(createMapFunctoid('assistant-functoid'));
    map.pages.push({ id: 'review-page', name: 'Review', links: [], functoids: [] });
    await host.send({
      type: 'copilotResult',
      data: { success: true, applied: true, message: 'Applied 1 link and 1 functoid. Review the result.', map },
    });

    await expect(panel.locator('.copilot-result')).toHaveText('Applied 1 link and 1 functoid. Review the result.');
    await expect(panel.locator('#copilot-prompt')).toBeEnabled();
    await expect(panel.getByRole('button', { name: 'Apply with Assistant', exact: true })).toBeEnabled();
    await expect(ui.pageTabs).toHaveText(['Assistant mappings', 'Review']);
    await expect(ui.statusBar).toContainText('Links: 1');
    await expect(ui.statusBar).toContainText('Functoids: 1');
    expect(host.messages('update')).toEqual([]);

    test.fail(true, 'Applied assistant maps leave the added functoid unrendered despite updating links and connection state.');
    await expect
      .poll(
        async () => ({
          links: await ui.link('assistant-link').count(),
          functoids: await ui.functoidNodes.count(),
          sourceConnected: (await ui.connector('source', paths.source.orderId).getAttribute('class'))?.split(/\s+/).includes('connected'),
          targetConnected: (await ui.connector('target', paths.target.invoiceId).getAttribute('class'))?.split(/\s+/).includes('connected'),
        }),
        { timeout: 1_000 }
      )
      .toEqual({ links: 1, functoids: 1, sourceConnected: true, targetConnected: true });
  });

  test('does not replace the map when the host returns an unapplied proposal', async ({ mapper }) => {
    await mapper.open();
    const { ui, host } = mapper;
    await ui.copilotButton.click();
    const panel = ui.page.locator('biztalk-copilot-panel');
    await panel.locator('#copilot-prompt').fill('Propose an identifier mapping.');
    const posted = host.waitForNext('copilotPrompt');
    await panel.getByRole('button', { name: 'Apply with Assistant', exact: true }).click();
    await posted;
    const proposal = createMap();
    proposal.pages[0].name = 'Unapplied proposal';
    proposal.pages[0].links.push(createSchemaLink('proposal-link', paths.source.orderId, paths.target.invoiceId));
    await host.send({
      type: 'copilotResult',
      data: { success: true, applied: false, message: 'Review cancelled. No map changes were applied.', map: proposal },
    });

    await expect(panel.locator('.copilot-result')).toHaveText('Review cancelled. No map changes were applied.');
    await expect(panel.locator('#copilot-prompt')).toHaveValue('Propose an identifier mapping.');
    await expect(panel.getByRole('button', { name: 'Apply with Assistant', exact: true })).toBeEnabled();
    await expect(ui.pageTabs).toHaveText(['Page 1']);
    await expect(ui.links).toHaveCount(0);
    expect(host.messages('update')).toEqual([]);
  });

  test('shows exact host error text, retains mappings and permits a corrected retry', async ({ mapper }) => {
    const map = createMap();
    map.pages[0].links.push(createSchemaLink('existing-link', paths.source.orderId, paths.target.invoiceId));
    await mapper.open({ map });
    const { ui, host } = mapper;
    await ui.copilotButton.click();
    const panel = ui.page.locator('biztalk-copilot-panel');
    const prompt = panel.locator('#copilot-prompt');
    await prompt.fill('Connect a missing source field.');
    const posted = host.waitForNext('copilotPrompt');
    await prompt.press('Control+Enter');
    await posted;
    const message = 'Validation failed: source field "Missing" was not found.\nNo changes were applied.';
    await host.send({ type: 'copilotResult', data: { success: false, applied: false, message } });

    await expect(panel.locator('.copilot-result')).toHaveText(message);
    await expect(prompt).toBeEnabled();
    await expect(prompt).toHaveValue('Connect a missing source field.');
    await expect(ui.link('existing-link')).toHaveCount(1);
    await expect(ui.statusBar).toContainText('Links: 1');
    expect(host.messages('update')).toEqual([]);

    await prompt.fill('Connect the existing order identifier.');
    const retry = host.waitForNext('copilotPrompt');
    await prompt.press('Control+Enter');
    expect(await retry).toEqual({
      type: 'copilotPrompt',
      data: { prompt: 'Connect the existing order identifier.', activePage: 0 },
    });
    await expect(panel.locator('.copilot-result')).toHaveText('Data Mapper Assistant is preparing a validated map edit…');
    expect(host.messages('copilotPrompt')).toHaveLength(2);
  });
});
