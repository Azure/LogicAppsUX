import type { CopyInputControlProps } from '..';
import { CopyInputControl } from '..';
import type { CopyInputControlWithAgentProps } from '../CopyInputControlWithAgent';
import { CopyInputControlWithAgent } from '../CopyInputControlWithAgent';
import renderer from 'react-test-renderer';
import { describe, vi, beforeEach, afterEach, it, expect } from 'vitest';
import { cleanup } from '@testing-library/react';

vi.mock('tabster', () => ({
  getTabster: () => ({
    dispose: vi.fn(),
  }),
  disposeTabster: () => {},
  Types: {},
  // Prevent internal polling
  createTabster: () => ({}),
}));

vi.mock('@fluentui/react-components', async () => {
  const actual = await vi.importActual('@fluentui/react-components');
  return {
    ...actual,
    FluentProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

describe('lib/copyinputcontrol', () => {
  let minimal: CopyInputControlProps;
  let minimalWithAgent: CopyInputControlWithAgentProps;

  const renderWithProvider = (component: React.ReactElement) => {
    return renderer.create(component);
  };

  beforeEach(() => {
    minimal = {
      placeholder: 'URL goes here',
      text: 'http://test.com',
    };

    minimalWithAgent = {
      placeholder: 'URL goes here',
      text: 'http://test.com',
    };
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.clearAllTimers();
  });

  it('should construct the copyinputcontrol correctly', () => {
    const tree = renderWithProvider(<CopyInputControl {...minimal} />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('should set the aria-labelledby attribute', () => {
    const tree = renderWithProvider(<CopyInputControl {...minimal} ariaLabelledBy="aria-labelledby" />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('should render with popup button when showAgentViewer is true', () => {
    const tree = renderWithProvider(<CopyInputControlWithAgent {...minimalWithAgent} showAgentViewer={true} />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('should render basic CopyInputControl without agent functionality', () => {
    const tree = renderWithProvider(<CopyInputControl {...minimal} />).toJSON();
    expect(tree).toMatchSnapshot();
  });
});
