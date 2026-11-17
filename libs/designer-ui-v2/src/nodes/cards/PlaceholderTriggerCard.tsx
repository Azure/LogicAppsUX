import { forwardRef, useLayoutEffect, useRef, useState } from 'react';
import { makeStyles, shorthands, tokens } from '@fluentui/react-components';
import { FlashFilled, FlashRegular } from '@fluentui/react-icons';
import { NodeCard } from '../primitives/NodeCard';
import { NodeCardBody } from '../primitives/NodeCardBody';
import { NodeOutputHandles } from '../primitives/NodeHandle';
import { NodeIconTile } from '../primitives/NodeIconTile';
import type { PlaceholderTriggerStrings } from '../strings';
import { defaultNodeStrings } from '../strings';
import type { BaseNodeCardProps } from './shared';

const OUTPUTS = ['neutral'] as const;
const DASH_ARRAY = '5 5';
export const PLACEHOLDER_TRIGGER_TITLE = defaultNodeStrings.placeholder.title;
const useStyles = makeStyles({
  outline: {
    position: 'absolute',
    inset: `calc(-1 * ${tokens.strokeWidthThin})`,
    width: `calc(100% + 2 * ${tokens.strokeWidthThin})`,
    height: `calc(100% + 2 * ${tokens.strokeWidthThin})`,
    overflow: 'visible',
    pointerEvents: 'none',
    fill: 'none',
    stroke: tokens.colorNeutralStrokeAccessible,
    strokeWidth: tokens.strokeWidthThin,
    '@media (forced-colors: active)': { display: 'none' },
  },
  tile: {
    ...shorthands.borderColor(tokens.colorNeutralStrokeAccessible),
    backgroundColor: 'transparent',
    color: tokens.colorNeutralForeground2,
  },
  label: {
    display: '-webkit-box',
    WebkitBoxOrient: 'vertical',
    WebkitLineClamp: 2,
    overflow: 'hidden',
    flexGrow: 1,
    minWidth: 0,
    fontFamily: 'inherit',
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightRegular,
    lineHeight: tokens.lineHeightBase300,
    color: tokens.colorNeutralForeground2,
  },
});
interface OutlineGeometry {
  width: number;
  height: number;
  leading: number;
  trailing: number;
}

const outlinePath = ({ width, height, leading, trailing }: OutlineGeometry): string => {
  const x0 = 0.5;
  const y0 = 0.5;
  const x1 = width - 0.5;
  const y1 = height - 0.5;
  const rL = Math.max(0, Math.min(leading, (y1 - y0) / 2));
  const rR = Math.max(0, Math.min(trailing, (y1 - y0) / 2));
  return [
    `M ${x0 + rL} ${y0}`,
    `H ${x1 - rR}`,
    `A ${rR} ${rR} 0 0 1 ${x1} ${y0 + rR}`,
    `V ${y1 - rR}`,
    `A ${rR} ${rR} 0 0 1 ${x1 - rR} ${y1}`,
    `H ${x0 + rL}`,
    `A ${rL} ${rL} 0 0 1 ${x0} ${y1 - rL}`,
    `V ${y0 + rL}`,
    `A ${rL} ${rL} 0 0 1 ${x0 + rL} ${y0}`,
    'Z',
  ].join(' ');
};

/** Measure the unzoomed border box, in the card's own window (including iframe hosts). */
function DashedOutline() {
  const styles = useStyles();
  const ref = useRef<SVGSVGElement>(null);
  const [geometry, setGeometry] = useState<OutlineGeometry | null>(null);
  useLayoutEffect(() => {
    const card = ref.current?.parentElement;
    const view = card?.ownerDocument.defaultView;
    if (!card || !view) {
      return;
    }
    const measure = () => {
      const style = view.getComputedStyle(card);
      const next = {
        width: card.offsetWidth,
        height: card.offsetHeight,
        leading: Number.parseFloat(style.borderTopLeftRadius) || 0,
        trailing: Number.parseFloat(style.borderTopRightRadius) || 0,
      };
      setGeometry((prev) =>
        prev && prev.width === next.width && prev.height === next.height && prev.leading === next.leading && prev.trailing === next.trailing
          ? prev
          : next
      );
    };
    measure();
    if (typeof view.ResizeObserver === 'undefined') {
      return;
    }
    const observer = new view.ResizeObserver(measure);
    observer.observe(card);
    return () => observer.disconnect();
  }, []);
  return (
    <svg ref={ref} className={styles.outline} aria-hidden="true" focusable="false" data-placeholder-outline="">
      {geometry && geometry.width > 0 && geometry.height > 0 ? <path d={outlinePath(geometry)} strokeDasharray={DASH_ARRAY} /> : null}
    </svg>
  );
}

export type PlaceholderTriggerCardProps = Omit<
  BaseNodeCardProps,
  'title' | 'subtitle' | 'icon' | 'selectedIcon' | 'status' | 'statusDetail' | 'strings'
> & {
  title?: string;
  strings?: PlaceholderTriggerStrings;
};

/** Canonical empty trigger pill with a measured 5/5 dashed outline. */
export const PlaceholderTriggerCard = forwardRef<HTMLDivElement, PlaceholderTriggerCardProps>(function PlaceholderTriggerCard(
  { title, selected, strings = defaultNodeStrings.placeholder, ...rest },
  ref
) {
  const styles = useStyles();
  return (
    <NodeCard
      {...rest}
      ref={ref}
      shape="pill"
      width="standard"
      appearance="placeholder"
      selected={selected}
      data-node-card="placeholder-trigger"
    >
      {!selected && <DashedOutline />}
      <NodeCardBody>
        <NodeIconTile
          category="trigger"
          className={styles.tile}
          selected={selected}
          icon={<FlashRegular />}
          selectedIcon={<FlashFilled />}
        />
        <span className={styles.label}>{title ?? strings.title}</span>
        <NodeOutputHandles handles={OUTPUTS} />
      </NodeCardBody>
    </NodeCard>
  );
});
