import { describe, expect, it, vi } from 'vitest';
import { openFile } from '../openFile';

describe('openFile', () => {
  it('opens the tree item directly without the Azure Functions extension', async () => {
    const context = {} as any;
    const node = {
      openReadOnly: vi.fn().mockResolvedValue(undefined),
    } as any;

    await openFile(context, node);

    expect(node.openReadOnly).toHaveBeenCalledWith(context);
  });
});
