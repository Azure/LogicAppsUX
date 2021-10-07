import * as React from 'react';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';

import { CategoryPivot, CategoryPivotProps } from '../categorypivot';

describe('ui/recommendation3/_categorypivot', () => {
  const classNames = {
    categories: 'msla-categories',
  };

  let minimal: CategoryPivotProps, onCategoryClick: any, renderer: ReactShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    onCategoryClick = jest.fn();

    minimal = {
      categories: [
        { itemKey: 'ALL', linkText: 'Resources.RECOMMENDATION_CATEGORY_ALL' },
        { itemKey: 'CONNECTORS', linkText: 'Resources.RECOMMENDATION_CATEGORY_CONNECTORS' },
        { itemKey: 'ENTERPRISE_CONNECTORS', linkText: 'Resources.RECOMMENDATION_CATEGORY_ENTERPRISE_CONNECTORS' },
        { itemKey: 'BUILT_IN', linkText: 'Resources.RECOMMENDATION_CATEGORY_BUILT_IN' },
        { itemKey: 'CUSTOM', linkText: 'Resources.RECOMMENDATION_CATEGORY_CUSTOM' },
        { itemKey: 'MODULES', linkText: 'Resources.RECOMMENDATION_CATEGORY_MODULES' },
      ],
      selectedCategory: '',
      visible: true,
      onCategoryClick,
    };

    renderer = ReactShallowRenderer.createRenderer();
  });

  afterEach(() => {
    renderer.unmount();
  });

  it('should render', () => {
    renderer.render(<CategoryPivot {...minimal} />);

    const categoryPivot = renderer.getRenderOutput();
    expect(categoryPivot.props.className).toBe(classNames.categories);

    const pivot = React.Children.only(categoryPivot.props.children);
    expect(pivot.props.headersOnly).toBeTruthy();
    expect(pivot.props.selectedKey).toBe(minimal.selectedCategory);
    expect(pivot.props.onLinkClick).toEqual(minimal.onCategoryClick);

    const [allActions, connectors, enterpriseConnectors, builtIn, custom, modules]: any[] = React.Children.toArray(pivot.props.children); // tslint:disable-line: no-any
    expect(allActions.props.itemKey).toBe('ALL');
    expect(allActions.props.headerText).toBe('Resources.RECOMMENDATION_CATEGORY_ALL');
    expect(connectors.props.itemKey).toBe('CONNECTORS');
    expect(connectors.props.headerText).toBe('Resources.RECOMMENDATION_CATEGORY_CONNECTORS');
    expect(enterpriseConnectors.props.itemKey).toBe('ENTERPRISE_CONNECTORS');
    expect(enterpriseConnectors.props.headerText).toBe('Resources.RECOMMENDATION_CATEGORY_ENTERPRISE_CONNECTORS');
    expect(builtIn.props.itemKey).toBe('BUILT_IN');
    expect(builtIn.props.headerText).toBe('Resources.RECOMMENDATION_CATEGORY_BUILT_IN');
    expect(custom.props.itemKey).toBe('CUSTOM');
    expect(custom.props.headerText).toBe('Resources.RECOMMENDATION_CATEGORY_CUSTOM');
    expect(modules.props.itemKey).toBe('MODULES');
    expect(modules.props.headerText).toBe('Resources.RECOMMENDATION_CATEGORY_MODULES');
  });

  it('should not render when not visible', () => {
    const props = { ...minimal, visible: false };
    renderer.render(<CategoryPivot {...props} />);

    const categoryPivot = renderer.getRenderOutput();
    expect(categoryPivot).toBeNull();
  });
});
