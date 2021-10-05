import * as React from 'react';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';

import { DocumentationItem, DocumentationItemProps } from '../documentationitem';

describe('ui/recommendation3/_documentationitem', () => {
  let minimal: DocumentationItemProps, renderer: ReactShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    minimal = {
      description: 'description',
    };

    renderer = ReactShallowRenderer.createRenderer();
  });

  afterEach(() => {
    renderer.unmount();
  });

  it('should render', () => {
    renderer.render(<DocumentationItem {...minimal} />);

    const documentationItem = renderer.getRenderOutput();
    const [span] = React.Children.toArray(documentationItem.props.children) as React.ReactElement[];
    const [description] = React.Children.toArray(span.props.children);
    expect(description).toBe(minimal.description);
  });

  it('should call openWindow callback if set', () => {
    const openWindow = jest.fn().mockResolvedValue(true);
    const link = {
      url: 'https://docs.microsoft.com/en-us/connectors/office365/',
      urlDescription: 'Learn more',
    };

    renderer.render(<DocumentationItem link={link} openWindow={openWindow} {...minimal} />);

    const documentationItem = renderer.getRenderOutput();
    const [, anchor] = React.Children.toArray(documentationItem.props.children) as React.ReactElement[];

    const { onClick } = anchor.props;
    expect(onClick).toBeDefined();

    onClick();
    expect(openWindow).toHaveBeenCalled();
  });
});
