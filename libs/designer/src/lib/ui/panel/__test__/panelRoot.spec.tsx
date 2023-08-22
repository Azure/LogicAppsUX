import { PanelRoot } from '../panelRoot';
import type { PanelRootProps } from '../panelRoot';
import { PanelLocation } from '@microsoft/designer-ui';

describe('PanelRoot', () => {
  const props: PanelRootProps = { customPanelLocations: [], displayRuntimeInfo: false };
  const testPanel = PanelRoot(props);

  it('should have panelLocation on left', () => {
    expect(testPanel.props.panelLocation).toEqual(PanelLocation.Right);
  });

  it('should have panelLocation on left', () => {
    testPanel.props.customPanelLocations = undefined;
    expect(testPanel.props.panelLocation).toEqual(PanelLocation.Right);
  });

  it('should have panelLocation on right', () => {
    testPanel.props.customPanelLocations = [{ panelLocation: PanelLocation.Left, panelMode: 'Error' }];
    expect(testPanel.props.panelLocation).toEqual(PanelLocation.Left);
  });
});
