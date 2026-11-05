import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { DefaultHandle } from '../DefaultHandle';
import { EdgeDrawSourceHandle } from '../EdgeDrawSourceHandle';
import { EdgeDrawTargetHandle } from '../EdgeDrawTargetHandle';
import * as ReactIntl from 'react-intl';

const state = vi.hoisted(() => ({ shared: false, readOnly: false, acceptedShared: undefined as boolean | undefined }));
vi.mock('../../../../../core/state/designerOptions/designerOptionsSelectors', () => ({
  useSharedNodeUi: () => state.shared,
  useReadOnly: () => state.readOnly,
}));
vi.mock('@xyflow/react', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useNodeId: () => 'real-node',
  useNodesData: () => (state.acceptedShared === undefined ? null : { data: { presentation: { shared: state.acceptedShared } } }),
  Handle: ({ children, type, position, isConnectable, isConnectableStart, isConnectableEnd, ...props }: any) => (
    <div
      {...props}
      data-testid={`handle-${type}`}
      data-position={position}
      data-connectable={isConnectable}
      data-start={isConnectableStart}
      data-end={isConnectableEnd}
    >
      {children}
    </div>
  ),
}));

describe('real shared canvas handles', () => {
  beforeEach(() => {
    state.shared = false;
    state.readOnly = false;
    state.acceptedShared = undefined;
  });

  it('does not add shared dots to legacy source or target handles', () => {
    const { container } = render(
      <>
        <EdgeDrawSourceHandle />
        <EdgeDrawTargetHandle />
      </>
    );
    expect(container.querySelector('[data-handle]')).toBeNull();
  });

  it('uses exactly one canonical dot inside each real handle without assigning new IDs or altering permissions', () => {
    state.shared = true;
    const { container, getByTestId } = render(
      <>
        <EdgeDrawSourceHandle />
        <EdgeDrawTargetHandle />
      </>
    );
    expect(container.querySelectorAll('[data-handle="neutral"]')).toHaveLength(2);
    expect(getByTestId('handle-source')).toContainElement(container.querySelector('[data-handle]'));
    expect(getByTestId('handle-source')).toHaveAttribute('data-start', 'true');
    expect(getByTestId('handle-source')).toHaveAttribute('data-end', 'false');
    expect(getByTestId('handle-target')).toHaveAttribute('data-start', 'false');
    expect(getByTestId('handle-target')).toHaveAttribute('data-end', 'true');
    expect(getByTestId('handle-source')).not.toHaveAttribute('id');
    expect(getByTestId('handle-target')).not.toHaveAttribute('id');
  });

  it('keeps the existing read-only source suppression and the full-card target connection surface', () => {
    state.shared = true;
    state.readOnly = true;
    const { getByTestId } = render(
      <>
        <EdgeDrawSourceHandle />
        <EdgeDrawTargetHandle />
      </>
    );
    expect(getByTestId('handle-source')).toHaveStyle({ visibility: 'hidden' });
    expect(getByTestId('handle-target')).toHaveAttribute('data-connectable', 'true');
    expect(getByTestId('handle-target')).toHaveAttribute('data-port-hit-surface', 'card');
  });

  it('keeps structural default ports invisible and nonconnectable', () => {
    state.shared = true;
    const { container, getByTestId } = render(<DefaultHandle type="source" />);
    expect(container.querySelector('[data-handle]')).toBeNull();
    expect(getByTestId('handle-source')).toHaveAttribute('data-connectable', 'false');
  });

  it('slots transparent real ports into family dots without a second decorative dot', () => {
    state.shared = true;
    const { container, getByTestId } = render(
      <>
        <DefaultHandle type="source" contained />
        <EdgeDrawTargetHandle contained />
      </>
    );
    expect(container.querySelector('[data-handle]')).toBeNull();
    expect(getByTestId('handle-source')).toHaveAttribute('data-port-contained', 'true');
    expect(getByTestId('handle-target')).toHaveAttribute('data-port-contained', 'true');
    expect(getByTestId('handle-source')).toHaveStyle({ top: '50%', left: '50%' });
  });

  it('puts the unchanged structural source inside the single canonical convergence point', () => {
    state.shared = true;
    const { container, getByTestId, getByRole } = render(<DefaultHandle type="source" presentation="merge" label="Actual condition" />);
    expect(container.querySelectorAll('[data-node-card="merge"]')).toHaveLength(1);
    expect(container.querySelector('[data-node-card="merge"]')).toContainElement(getByTestId('handle-source'));
    expect(getByTestId('handle-source')).toHaveAttribute('data-connectable', 'false');
    expect(container.querySelector('[data-handle]')).toBeNull();
    expect(getByRole('img')).toHaveAccessibleName('Merge point for Actual condition');
  });

  it('applies exactly one localized merge formatter to the raw nonempty graph identity', () => {
    state.shared = true;
    const intl = ReactIntl.createIntl({ locale: 'fr', messages: { lQswd7: 'Point de fusion pour {label}' } });
    vi.spyOn(ReactIntl, 'useIntl').mockReturnValue(intl);
    const { getByRole } = render(<DefaultHandle type="source" presentation="merge" label="Condition_分岐" />);
    expect(getByRole('img')).toHaveAccessibleName('Point de fusion pour Condition_分岐');
  });

  it('keeps accepted shared ports visible while a rollback layout is pending', () => {
    state.shared = false;
    state.acceptedShared = true;
    const { container } = render(<EdgeDrawSourceHandle />);
    expect(container.querySelector('[data-handle]')).toBeInTheDocument();
  });

  it('keeps accepted legacy ports unchanged while a shared layout is pending', () => {
    state.shared = true;
    state.acceptedShared = false;
    const { container } = render(<EdgeDrawSourceHandle />);
    expect(container.querySelector('[data-handle]')).toBeNull();
  });

  it('retains the actual lane ID supplied by the graph owner in a canonical branch slot', () => {
    state.shared = true;
    const { getByTestId } = render(<DefaultHandle type="source" id="actual-lane-identity" contained />);
    expect(getByTestId('handle-source')).toHaveAttribute('id', 'actual-lane-identity');
    expect(getByTestId('handle-source')).toHaveAttribute('data-connectable', 'false');
  });
});
