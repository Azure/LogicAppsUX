import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CustomControls from '../Controls';

const controls = vi.hoisted(() => ({
  shared: true,
  accepted: false,
  flow: {
    fitView: vi.fn(),
    zoomIn: vi.fn(),
    zoomOut: vi.fn(),
    setViewport: vi.fn(),
    getNodes: () => [],
    getNodesBounds: () => ({ x: 0, y: 0, width: 232, height: 600 }),
  },
}));
vi.mock('react-redux', () => ({ useDispatch: () => vi.fn() }));
vi.mock('../../core/state/designerOptions/designerOptionsSelectors', () => ({ useSharedNodeUi: () => controls.shared }));
vi.mock('../../core/state/designerView/designerViewSelectors', () => ({ useShowMinimap: () => false }));
vi.mock('../../core/graphlayout', () => ({
  useLayout: () => [[{ id: 'real', data: { presentation: { shared: controls.accepted } } }], [], [272, 640]],
}));
vi.mock('../common/controls/collapseExpandControl', () => ({ default: () => null }));
vi.mock('@xyflow/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@xyflow/react')>()),
  useReactFlow: () => controls.flow,
  Controls: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  ControlButton: (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props} />,
}));
afterEach(() => vi.clearAllMocks());

describe('shared fit command wiring', () => {
  it('keeps the existing fitView command while a shared toggle still has accepted legacy geometry', () => {
    controls.shared = true;
    controls.accepted = false;
    render(<CustomControls canvasRef={{ current: document.createElement('div') }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Zoom view to fit' }));
    expect(controls.flow.fitView).toHaveBeenCalledOnce();
    expect(controls.flow.setViewport).not.toHaveBeenCalled();
  });
  it('uses accepted root extents for shared geometry even while the live flag is toggled off', () => {
    controls.shared = false;
    controls.accepted = true;
    const canvas = document.createElement('div');
    canvas.getBoundingClientRect = () => ({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 1280,
      bottom: 720,
      width: 1280,
      height: 720,
      toJSON: () => ({}),
    });
    render(<CustomControls canvasRef={{ current: canvas }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Zoom view to fit' }));
    expect(controls.flow.fitView).not.toHaveBeenCalled();
    expect(controls.flow.setViewport).toHaveBeenCalledOnce();
  });
});
