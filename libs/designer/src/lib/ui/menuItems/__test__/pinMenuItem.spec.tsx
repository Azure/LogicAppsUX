import React from 'react';
import { PinMenuItem } from '../pinMenuItem';
import renderer from 'react-test-renderer';
import { describe, vi, beforeEach, afterEach, beforeAll, afterAll, it, test, expect } from 'vitest';

import * as PanelSelectors from '../../../core/state/panelV2/panelSelectors';

describe('lib/ui/menuItems/pinMenuItem', () => {
  it.each([true, false])('should render for actions if pinned=%s', (isPinned) => {
    vi.spyOn(PanelSelectors, 'useIsNodePinned').mockReturnValue(isPinned);
    const tree = renderer.create(<PinMenuItem nodeId="List_folder" onClick={vi.fn()} />).toJSON();
    expect(tree).toMatchSnapshot();
  });
});
