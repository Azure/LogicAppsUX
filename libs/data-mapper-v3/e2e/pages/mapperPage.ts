import type { Locator, Page } from '@playwright/test';

export type Side = 'source' | 'target';

export class MapperPage {
  constructor(readonly page: Page) {}

  readonly app = this.page.locator('[data-component="mapper-app"]');
  readonly validateButton = this.page.locator('#btn-validate-compile');
  readonly testMapButton = this.page.locator('#btn-test-map');
  readonly deployButton = this.page.locator('#btn-deploy-logicapp');
  readonly copilotButton = this.page.locator('#btn-copilot');
  readonly toolbarStatus = this.page.locator('#toolbar-status');
  readonly notification = this.page.locator('biztalk-mapper-notification [role="group"], biztalk-mapper-notification .fui-MessageBar');
  readonly statusBar = this.page.locator('biztalk-mapper-statusbar');
  readonly links = this.page.locator('.mapping-links-overlay [data-link-id]');
  readonly functoidNodes = this.page.locator('.functoid-node');
  readonly pageTabs = this.page.locator('.page-tab');
  readonly addPageButton = this.page.locator('#btn-add-page');
  readonly bottomPanel = this.page.locator('biztalk-mapper-bottom-panel .bottom-panel');
  readonly instanceEditor = this.page.locator('biztalk-mapper-bottom-panel textarea');
  readonly testOutput = this.page.locator('biztalk-mapper-bottom-panel pre');

  /** Schemas rendered, palette populated, canvas mounted. */
  async waitUntilReady(): Promise<void> {
    await this.tree('source').locator('.tree-node').first().waitFor();
    await this.tree('target').locator('.tree-node').first().waitFor();
    await this.page.locator('biztalk-functoid-palette .palette-item').first().waitFor();
    await this.page.locator('biztalk-mapping-canvas svg.mapping-svg').waitFor();
  }

  tree(side: Side): Locator {
    return this.page.locator(`biztalk-schema-tree.${side}-tree`);
  }

  treeNode(side: Side, nodePath: string): Locator {
    return this.tree(side).locator(`.tree-node[data-path="${nodePath}"]`);
  }

  connector(side: Side, nodePath: string): Locator {
    return this.tree(side).locator(`.node-connector[data-path="${nodePath}"]`);
  }

  schemaPicker(side: Side): Locator {
    // The picker lives in the empty-schema placeholder (nothing loaded) or in the tree header (schema loaded); only one is visible.
    return this.page.getByRole('combobox', { name: `Choose ${side} schema` });
  }

  /** Click source connector then target connector: the controller's click-to-link flow. */
  async connectSchemaNodes(sourcePath: string, targetPath: string): Promise<void> {
    await this.connector('source', sourcePath).click();
    await this.connector('target', targetPath).click();
  }

  paletteItem(displayName: string): Locator {
    return this.page
      .locator('biztalk-functoid-palette .palette-item')
      .filter({ has: this.page.locator('.item-name', { hasText: displayName }) });
  }

  paletteCategoryHeader(category: string): Locator {
    return this.page
      .locator('.palette-category')
      .filter({ has: this.page.locator('.category-name', { hasText: category }) })
      .locator('.category-header');
  }

  functoidNode(index = 0): Locator {
    return this.functoidNodes.nth(index);
  }

  functoidInput(index = 0): Locator {
    return this.functoidNode(index).locator('.input-connector');
  }

  functoidOutput(index = 0): Locator {
    return this.functoidNode(index).locator('.output-connector');
  }

  /** Clicking a palette item drops a new functoid on the active page. */
  async addFunctoid(displayName: string): Promise<void> {
    await this.paletteItem(displayName).click();
  }

  link(linkId: string): Locator {
    return this.page.locator(`.mapping-links-overlay [data-link-id="${linkId}"]`);
  }

  async selectLink(linkId: string): Promise<void> {
    // The wide transparent path is the click target; the visible stroke ignores pointer events.
    await this.link(linkId).locator('path').first().click({ force: true });
  }
}
