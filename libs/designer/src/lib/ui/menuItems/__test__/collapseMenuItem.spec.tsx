import React from 'react';
import renderer from 'react-test-renderer';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { IntlProvider } from 'react-intl';
import { CollapseMenuItem } from '../collapseMenuItem';
import * as WorkflowSelectors from '../../../core/state/workflow/workflowSelectors';

describe('lib/ui/menuItems/collapseMenuItem', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const renderComponent = (isCollapsed: boolean) => {
    vi.spyOn(WorkflowSelectors, 'useIsActionCollapsed').mockReturnValue(isCollapsed);

    return renderer
      .create(
        <IntlProvider locale="en">
          <CollapseMenuItem nodeId="Test_node" onClick={vi.fn()} />
        </IntlProvider>
      )
      .toJSON();
  };

  it.each([false, true])('should render correctly when isCollapsed is %s', (isCollapsed) => {
    const tree = renderComponent(isCollapsed);
    expect(tree).toMatchSnapshot();
  });
});
