import type { CopyInputControlProps } from '..';
import { CopyInputControl } from '..';
import type { CopyInputControlWithAgentProps } from '../CopyInputControlWithAgent';
import { CopyInputControlWithAgent } from '../CopyInputControlWithAgent';
import renderer from 'react-test-renderer';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../AgentUrlViewer', () => ({
  AgentUrlViewer: () => null,
  AgentUrlButton: () => null,
}));

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
