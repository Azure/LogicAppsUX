import type { DocumentationLinkItemProps } from '../index';
import { DocumentationLinkItem } from '../index';
import renderer from 'react-test-renderer';
import { describe, vi, beforeEach, afterEach, beforeAll, afterAll, it, test, expect } from 'vitest';
describe('lib/documentationlinkitem', () => {
  let minimal: DocumentationLinkItemProps;

  beforeEach(() => {
    minimal = {
      url: 'https://aka.ms/logicapps-chunk',
    };
  });

  it('should render', () => {
    const tree = renderer.create(<DocumentationLinkItem {...minimal} />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('should render with a description', () => {
    const tree = renderer.create(<DocumentationLinkItem {...minimal} description="description" />).toJSON();
    expect(tree).toMatchSnapshot();
  });
});
