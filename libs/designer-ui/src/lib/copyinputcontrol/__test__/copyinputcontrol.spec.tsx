import type { CopyInputControlProps } from '..';
import { CopyInputControl } from '..';
import type { CopyInputControlWithAgentProps } from '../CopyInputControlWithAgent';
import { CopyInputControlWithAgent } from '../CopyInputControlWithAgent';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import renderer from 'react-test-renderer';
import { describe, vi, beforeEach, afterEach, beforeAll, afterAll, it, test, expect } from 'vitest';
import { cleanup } from '@testing-library/react';
describe('lib/copyinputcontrol', () => {
  let minimal: CopyInputControlProps;
  let minimalWithAgent: CopyInputControlWithAgentProps;

  const renderWithProvider = (component: React.ReactElement) => {
    return renderer.create(<FluentProvider theme={webLightTheme}>{component}</FluentProvider>);
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
    // Dispose of anything that might keep jsdom alive
    cleanup(); // unmount React trees
    vi.useRealTimers(); // reset timers in case fake timers used
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
