import { makeStaticStyles, makeStyles, tokens, shorthands } from '@fluentui/react-components';
import { customTokens } from '../core/ThemeConect';

export const useStyles = makeStyles({
  root: {
    backgroundColor: tokens.colorNeutralBackground1,
    display: 'flex',
    height: '100vh',
    width: '100vw',
    minHeight: 'calc(100vh - 50px)',
    maxHeight: 'calc(100vh - 40px)',
    overflow: 'hidden',
    flex: '1 1 1px',
  },
  dataMapperFunctionPanel: {
    backgroundColor: customTokens['functionPanelBackground'],
    maxWidth: '80px',
    minWidth: '50px',
    ...shorthands.borderRight('1px', 'solid', tokens.colorNeutralStroke1),
  },
});

export const useStaticStyles = makeStaticStyles({
  // Firefox who's trying to early-adopt a WIP CSS standard (as of 11/2/2022)
  '*': {
    scrollbarColor: `${tokens.colorScrollbarOverlay} ${tokens.colorNeutralBackground1Hover}`,
    scrollbarWidth: 'thin',
  },
  // Any WebKit browsers (essentially every other browser) - supposedly will eventually deprecate to the above
  '*::-webkit-scrollbar': {
    height: '8px',
    width: '8px',
  },
  '*::-webkit-scrollbar-track:active': {
    backgroundColor: tokens.colorNeutralBackground1Hover,
    border: `0.5px solid ${tokens.colorNeutralStroke2}`,
  },
  '*::-webkit-scrollbar-thumb': {
    backgroundClip: 'content-box',
    border: '2px solid transparent',
    borderRadius: '10000px',
    backgroundColor: tokens.colorScrollbarOverlay,
  },
  '.react-flow svg': {
    overflow: 'visible !important',
  },
  '.react-flow': {
    overflow: 'visible !important',
    zIndex: '99 !important',
  },
  '.react-flow__minimap': {
    borderRadius: tokens.borderRadiusMedium,
    overflow: 'hidden',
    boxShadow: tokens.shadow8,
    backgroundColor: tokens.colorNeutralBackground1,
    '& svg': {
      width: '100%',
      height: '100%',
    },
  },
  '.react-flow__minimap-mask': {
    stroke: tokens.colorBrandStroke1,
    strokeWidth: '6px',
    strokeLinejoin: 'round',
    fillOpacity: '0',
  },
  '.react-flow__node': {
    zIndex: '200 !important',
  },
  '.react-flow__node-schemaPanel': {
    top: '0 !important',
  },
});
