import type { CardProps } from '../index';
import { Card } from '../index';
import React from 'react';
import renderer from 'react-test-renderer';
import { describe, vi, beforeEach, afterEach, beforeAll, afterAll, it, test, expect } from 'vitest';

describe('lib/card', () => {
  let minimal: CardProps;

  beforeEach(() => {
    minimal = {
      brandColor: '#474747',
      drag: () => null,
      dragPreview: () => null,
      draggable: false,
      id: 'id',
      title: 'title',
      isSecureInputsOutputs: false,
      runData: undefined,
    };
  });

  it('should render', () => {
    const tree = renderer.create(<Card {...minimal} />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('should render as inactive', () => {
    const tree = renderer.create(<Card {...minimal} active={false} />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('should render as cloned', () => {
    const tree = renderer.create(<Card {...minimal} cloned={true} />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('should render as draggable', () => {
    const tree = renderer.create(<Card {...minimal} draggable={true} />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('should render as selected', () => {
    const tree = renderer.create(<Card {...minimal} selectionMode="selected" />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('should render as pinned', () => {
    const tree = renderer.create(<Card {...minimal} selectionMode="pinned" />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it.each<[string, string | undefined, string | undefined]>([
    ['a connector name', 'SharePoint', undefined],
    ['an operation name', undefined, 'Get an item'],
    ['an operation name and connector name', 'SharePoint', 'Get an item'],
  ])('should render with an icon and %s (%#)', (_caseName, connectorName, operationName) => {
    const tree = renderer
      .create(
        <Card
          {...minimal}
          connectorName={connectorName}
          icon="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
          operationName={operationName}
        />
      )
      .toJSON();
    expect(tree).toMatchSnapshot();
  });
});
