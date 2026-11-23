import { makeStyles, tokens } from '@fluentui/react-components';
import { NodeLine } from './NodeLine';

const useStyles = makeStyles({
  join: {
    position: 'absolute',
    transform: 'translateX(-50%)',
    pointerEvents: 'none',
    '[data-loop-active] > & > path': {
      stroke: tokens.colorBrandStroke1,
      '@media (forced-colors: active)': { stroke: 'Highlight' },
    },
  },
  header: {
    '&[data-loop-group-header][data-loop-active]:not([data-selected])': {
      outline: `${tokens.strokeWidthThin} solid ${tokens.colorBrandStroke1}`,
      outlineOffset: '-1px',
      '@media (forced-colors: active)': { outlineColor: 'Highlight' },
    },
  },
  body: {
    '&[data-loop-active] > [data-node-card="loop-frame"]:not([data-selected])': {
      outlineStyle: 'solid',
      outlineWidth: tokens.strokeWidthThin,
      outlineColor: tokens.colorBrandStroke1,
      outlineOffset: '-1px',
      '@media (forced-colors: active)': { outlineColor: 'Highlight' },
    },
  },
});

export function LoopBodyJoin({ x, y, length }: { x: number; y: number; length: number }) {
  const styles = useStyles();
  return (
    <NodeLine
      className={styles.join}
      style={{ left: x, top: y }}
      length={length}
      orientation="vertical"
      arrow={false}
      data-loop-body-join=""
    />
  );
}

/** Hover is a paint-only accent, independent of status tint and selection. */
export function useLoopBodyHoverClass(part: 'header' | 'body') {
  return useStyles()[part];
}
