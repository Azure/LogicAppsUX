import * as assert from 'assert';

export const designerV2ViewType = 'designerLocalV2';

export async function selectDesignerV2(
  getConfiguration: () => {
    update(section: string, value: number, target: number): PromiseLike<void>;
    get<T>(section: string): T | undefined;
  },
  workspaceTarget: number
): Promise<void> {
  await getConfiguration().update('designerVersion', 2, workspaceTarget);
  assert.strictEqual(getConfiguration().get<number>('designerVersion'), 2, 'Scenario requires exact Designer V2 Code/Workflow views');
}
