import { makeStaticStyles, makeStyles, tokens, shorthands } from '@fluentui/react-components';
import type { CSSProperties } from 'react';

export const useStyles = makeStyles({
  dataMapperShell: {
    backgroundColor: tokens.colorNeutralBackground1,
    height: '100vh',
    minHeight: 'calc(100vh - 50px)',
    maxHeight: 'calc(100vh - 40px)',
    display: 'flex',
    ...shorthands.flex(1, 1, '1px'),
  },
  canvasWrapper: {
    height: '100%',
    display: 'flex',
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.flex(1, 1, '1px'),
  },
  reactFlow: {
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.overflow('visible'),
  },
  dataMapperFunctionPanel: {
    backgroundColor: '#E8F3FE',
    maxWidth: '80px',
    minWidth: '50px',
    ...shorthands.borderRight('1px', 'solid', '#ddd'),
  },
});

export const reactFlowStyle: CSSProperties = {
  height: '100%',
  backgroundColor: tokens.colorNeutralBackground1,
};

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
});
