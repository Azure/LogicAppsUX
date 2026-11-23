import { makeStyles, tokens } from '@fluentui/react-components';

/** Apply to the canvas at overview zoom, not to a card or to its hover-card portal. */
export const useNodeOverviewStyles = makeStyles({
  canvas: {
    '& [data-node-card] [data-node-title]': {
      fontSize: tokens.fontSizeBase400,
      lineHeight: tokens.lineHeightBase300,
    },
    '& [data-node-card] [data-node-caption]': { display: 'none' },
    '& [data-node-card] [data-node-status-icon]': { fontSize: tokens.fontSizeBase400 },
    // Enlarge the glyph within its existing tile, not the tile or the card.
    '& [data-node-card] [data-node-glyph]': { transform: 'scale(1.2)' },
    '& [data-node-card$="-frame"]:not([data-selected="true"])': {
      // Paint inside the existing boundary so handles and fitted bounds do not move.
      outline: `${tokens.strokeWidthThick} dashed ${tokens.colorNeutralForeground3}`,
      outlineOffset: `calc(-1 * ${tokens.strokeWidthThin})`,
    },
    '& :is(path[data-line], [data-line] > path, [data-branch-convergence] > path)': {
      // Host-managed edges also pass their normal stroke width inline.
      strokeWidth: `${tokens.strokeWidthThick} !important`,
    },
    '@media (forced-colors: none)': {
      '& :is(path[data-line="solid"], path[data-line="dashedNeutral"], [data-line="solid"] > path, [data-line-cap="solid"], [data-line-cap="dashedNeutral"], [data-branch-convergence] > path):not([data-line-highlighted])':
        { stroke: `${tokens.colorNeutralForeground3} !important` },
    },
  },
});
