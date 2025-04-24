/*!
 * Copyright (C) Microsoft Corporation. All rights reserved.
 */

import type { GriffelStyle } from '@fluentui/react-components';
import { makeStyles, tokens } from '@fluentui/react-components';
import { colors } from './universalColors';
import { msColorBlack, msColorBodyBackground, msColorEdge, msColorSecondaryBorder } from './ui-common.themes.styles';
import {
  cardBodyFontSize,
  cardMaxWidth,
  cardMinWidth,
  cardV2SmallHeight,
  cardV2SmallWidth,
  menuItemsIconColor,
} from './ui-common.variables.styles';

export const flexRowStyle: GriffelStyle = {
  display: 'flex',
  gap: '8px',
  flexWrap: 'wrap',
  alignItems: 'center',
  justifyContent: 'space-between',
};

const collapsedPanelWidth = 41; // Found using dev tools inspector.
const designerControlsButtonSize = 44;
const designerControlsInset = 20;

export const useDesignerStyles = makeStyles({
  designerWithReactFlow: {
    height: 'inherit',
    '& .react-flow__edges': {
      zIndex: '100 !important',
      // The flow edges sometimes get hidden if this is not set due to root svg overwriting it.
      '& svg': {
        overflow: 'visible !important',
      },
    },
    '& .react-flow__edge': {
      cursor: 'grab',
      '& .react-flow__edge-path': {
        pointerEvents: 'none',
      },
    },
    '& .react-flow__node': {
      cursor: 'default !important',
      pointerEvents: 'none',
      transition: 'transform 0.1s ease-in-out, width 0.1s ease-in-out, height 0.1s ease-in-out',
      '& > div': {
        pointerEvents: 'initial',
      },
    },
    '& .react-flow__panel': {
      backgroundColor: tokens.colorNeutralBackground1,
      margin: '0px !important',
      zIndex: '0 !important',
    },
    '& .react-flow__minimap': {
      backgroundColor: tokens.colorNeutralBackground1,
      position: 'relative',
      left: `calc(${designerControlsButtonSize}px + ${tokens.spacingHorizontalM}) !important`,
      bottom: '0px !important',
      width: '300px',
      height: '225px',
      borderRadius: '4px',
      overflow: 'hidden',
      boxShadow: '0px 3.2px 7.2px rgba(0, 0, 0, 0.132), 0px 0.6px 1.8px rgba(0, 0, 0, 0.108) !important',
      '& svg': {
        height: '100%',
        width: '100%',
      },
    },
    '& .react-flow__minimap-mask': {
      stroke: '#1f85ff',
      strokeWidth: '6px',
      strokeLinejoin: 'round',
      fill: '#ffffffb3', // white, 70% opacity
    },
    '& .react-flow__minimap-node': {
      strokeWidth: '1px',
      strokeLinejoin: 'round',
    },
    '& .react-flow__controls-button': {
      borderBottom: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke3}`,
      boxSizing: 'border-box', // Some other Portal pages use different `@xyflow/react` versions which have 'content-box', resulting in jumbo buttons.
      height: `${designerControlsButtonSize}px`,
      padding: `${tokens.spacingVerticalM} ${tokens.spacingHorizontalM}`,
      width: `${designerControlsButtonSize}px`,
      '&:hover': {
        backgroundColor: tokens.colorNeutralBackground1Hover,
      },
      '& svg': {
        height: '100%',
        maxHeight: 'unset',
        maxWidth: 'unset',
        width: '100%',
      },
    },
    '& .react-flow__edge-path': {
      strokeWidth: '2 !important',
    },
  },
  designerWithReactFlowDark: {
    '& .react-flow__minimap': {
      background: msColorBodyBackground,
    },
    '& .react-flow__minimap-mask': {
      fill: '#323130b3', // nodeBackground, 70% opacity
    },
    '& .react-flow__edge-path': {
      stroke: msColorEdge,
    },
    '& .react-flow__edge': {
      '& marker > path': {
        fill: msColorEdge,
      },
    },
  },
  designerWithJsPlumbToolkit: {
    // These may not be used anymore, but were migrated during LAUX fork.
    // https://docs.jsplumbtoolkit.com/community/6.x/lib/styling-via-css
    '& .jtk-connector': {
      zIndex: '4',
    },
    '& .jtk-managed': {
      zIndex: '10',
    },
    '& .jtk-overlay': {
      zIndex: '10',
    },
  },
  designerWithJsPlumbToolkitDark: {
    // These may not be used anymore, but were migrated during LAUX fork.
    // https://docs.jsplumbtoolkit.com/community/6.x/lib/styling-via-css
    '& .jtk-connector > path': {
      stroke: '#c2cbd6' /* #456 in light mode */,
    },
  },
  designerWithBrowserOverrides: {
    '& ::-webkit-input-placeholder': {
      color: colors.placeholder /* Chrome */,
    },
    '& ::-moz-placeholder': {
      color: colors.placeholder /* Firefox 19+ */,
      opacity: '1',
    },
  },
  designerWithFluentOverrides: {
    '& [class^="ms-DetailsHeader"]': {
      /* TODO: Replace this with proper Fabric styling if and when they enabled custom details list column styles */
      '& [class^="ms-DetailsHeader-cellName"]': {
        '& .ms-DetailsHeader-cellName': {
          fontSize: cardBodyFontSize,
          fontWeight: 'normal',
        },
      },
    },
    "& [class^='ms-ContextualMenu-item']": {
      "& [class^='ms-ContextualMenu-linkContent']": {
        "& [class^='ms-Image']": {
          color: menuItemsIconColor,
        },
      },
    },
  },
  designerWithFluentOverridesDark: {
    '& .ms-Pivot-link': {
      background: 'none',
    },
    '& .ms-Panel-main': {
      boxShadow: 'none',
      borderLeftColor: msColorSecondaryBorder,
      borderRightColor: msColorSecondaryBorder,
    },
    '& [class^="ms-Fabric"]': {
      color: msColorBlack,
    },
  },
  designerCanvas: {
    display: 'flex',
    flex: '1',
    margin: '0 auto',
    minWidth: '100%',
    overflow: 'hidden',
    [`@media only screen and (max-width: calc(${cardMaxWidth} + 40))`]: {
      width: '100%',
      minWidth: cardMinWidth,
    },
    '& img': {
      verticalAlign: 'baseline',
    },
    "& [data-color-scheme='dark']": {
      colorScheme: 'dark',
    },
    "& [data-color-scheme='light']": {
      colorScheme: 'light',
    },
  },
  designerCanvasDark: {
    backgroundColor: msColorBodyBackground,
  },
  designerTools: {
    position: 'absolute',
    left: `${designerControlsInset}px`,
    bottom: `${designerControlsInset}px`,
    display: 'flex',
    gap: '8px',
    alignItems: 'flex-end',
    boxSizing: 'border-box',
    zIndex: '5', // React-flow renderer has a z-index of 4 and this needs to be on top of it.
  },
  designerToolsWithLeftPanel: {
    left: `${designerControlsInset + collapsedPanelWidth}px`,
  },
  designerPanelMode: {
    position: 'relative',
    '& .msla-drop-zone-viewmanager': {
      display: 'flex',
      justifyContent: 'center',
      alignContent: 'center',
      height: cardV2SmallHeight,
      maxWidth: cardV2SmallWidth,
      cursor: 'grab',
      margin: '0px auto',
      boxSizing: 'border-box',
    },
    '& .canDrop': {
      background: '#e7f4ff',
      outline: '2px dashed #0078d4',
      borderRadius: '4px',
    },

    '& .cannotDrop': {
      background: '#b1b1b7',
      maxWidth: '24px',
      height: '24px',
      borderRadius: '12px',
    },
  },
});
