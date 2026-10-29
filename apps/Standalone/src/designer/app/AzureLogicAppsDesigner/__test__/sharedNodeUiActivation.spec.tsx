// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { LocalDesigner } from '../../LocalDesigner/localDesignerV2';
import type { LocalOperationManifestService } from '../../LocalDesigner/localOperationManifestService';

const controls = vi.hoisted(() => ({
  options: {} as Record<string, unknown>,
  services: {} as { operationManifestService: LocalOperationManifestService },
}));
vi.mock('react-redux', () => ({
  useDispatch: () => vi.fn(),
  useSelector: (select: (state: unknown) => unknown) =>
    select({
      workflowLoader: { hostOptions: {}, hostingPlan: 'standard' },
    }),
}));
vi.mock('@microsoft/logic-apps-designer-v2', () => ({
  DesignerProvider: ({ options, children }: { options: Record<string, unknown>; children: ReactNode }) => {
    controls.options = options;
    controls.services = options.services as typeof controls.services;
    return children;
  },
  BJSWorkflowProvider: () => null,
  Designer: () => null,
  CombineInitializeVariableDialog: () => null,
  TriggerDescriptionDialog: () => null,
}));
vi.mock('../../LocalDesigner/pseudoCommandBar', () => ({ PseudoCommandBarV2: () => null }));
vi.mock('../../LocalDesigner/customEditorService', () => ({ CustomEditorService: class {} }));
vi.mock('../../LocalDesigner/customConnection/customConnectionParameterEditorService', () => ({
  CustomConnectionParameterEditorService: class {},
}));

afterEach(cleanup);

describe('Standalone shared-node local opt-in', () => {
  it('uses complete offline Compose metadata in ordinary Local Standard without enabling extraction', async () => {
    render(
      <MemoryRouter initialEntries={['/v2']}>
        <LocalDesigner />
      </MemoryRouter>
    );
    const service = controls.services.operationManifestService;
    expect(service.constructor.name).toBe('LocalOperationManifestService');
    const info = await service.getOperationInfo({ type: 'Compose', inputs: 'value' }, false);
    const manifest = await service.getOperationManifest(info.connectorId, info.operationId);
    expect(manifest.properties.summary).toBe('Compose');
    expect(manifest.properties.inputs).toBeDefined();
    expect(manifest.properties.iconUri).toMatch(/^data:image\/svg/);
  });

  it.each([
    ['', false],
    ['?useSharedNodeUi=false', false],
    ['?useSharedNodeUi=1', false],
    ['?useSharedNodeUi=TRUE', false],
    ['?useSharedNodeUi=true', true],
    ['?extraction=true&useSharedNodeUi=true', true],
  ])('passes %s through public provider options without changing host settings', (search, expected) => {
    render(
      <MemoryRouter initialEntries={[`/v2${search}`]}>
        <LocalDesigner />
      </MemoryRouter>
    );
    expect(controls.options.useSharedNodeUi ?? false).toBe(expected);
    expect(controls.options.hostOptions).not.toHaveProperty('useSharedNodeUi');
  });
});
