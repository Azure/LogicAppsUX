import React from 'react';
import { PinMenuItem } from '../pinMenuItem';
import renderer from 'react-test-renderer';
import { IntlProvider } from 'react-intl';
import { describe, vi, it, expect } from 'vitest';

import * as PanelSelectors from '../../../core/state/panel/panelSelectors';

describe('lib/ui/menuItems/pinMenuItem', () => {
  it.each([true, false])('should render for actions if pinned=%s', (isPinned) => {
    vi.spyOn(PanelSelectors, 'useIsNodePinnedToOperationPanel').mockReturnValue(isPinned);
    const tree = renderer
      .create(
        <IntlProvider locale="en">
          <PinMenuItem nodeId="List_folder" onClick={vi.fn()} />
        </IntlProvider>
      )
      .toJSON();
    expect(tree).toMatchSnapshot();
  });
});
