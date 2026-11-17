import { createContext, forwardRef, useContext, useState } from 'react';
import type { CSSProperties, HTMLAttributes } from 'react';
import { makeStyles, mergeClasses } from '@fluentui/react-components';
import { createNodeHoverCardGroup, NodeHoverCardGroupContext } from '../nodes/cards/nodeHoverCardGroup';

export type DesignerUiThemeOverrides = Partial<
  Record<
    | 'canvas-background'
    | 'node-surface'
    | 'node-surface-hover'
    | 'node-surface-selected'
    | 'node-border'
    | 'node-border-selected'
    | 'node-tile-background'
    | 'node-handle-background'
    | 'node-tool-connector-fill'
    | 'node-agent-surface'
    | 'node-agent-surface-hover'
    | 'node-agent-surface-selected'
    | 'node-test-data-stroke'
    | 'node-test-data-foreground'
    | 'agent-native-badge-background'
    | 'agent-native-badge-foreground',
    string
  >
>;

export interface DesignerUiScopeProps extends HTMLAttributes<HTMLDivElement> {
  enabled?: boolean;
  mode?: 'light' | 'dark';
  tokens?: DesignerUiThemeOverrides;
}

// Light mode paints white cards on a tinted canvas with a visible rest border (Fluent web light
// Background1 / Background2 / Stroke2). Dark mode keeps its existing surfaces; its new roles reference the
// Fluent variables the components used before the roles existed, so dark rendering only gains the
// darker connector fill. Fluent variables (rather than hex) let Portal high-contrast themes flow through.
const palettes = {
  light: {
    'canvas-background': '#fafafa',
    'node-surface': '#ffffff',
    'node-surface-hover': '#fafafa',
    'node-surface-selected': '#ffffff',
    'node-border': '#e0e0e0',
    'node-border-selected': '#8a8a8a',
    'node-tile-background': '#fcfcfc',
    'node-handle-background': '#fafafa',
    'node-tool-connector-fill': '#ffffff',
    'node-agent-surface': '#e1cefc',
    'node-agent-surface-hover': '#d5bcfb',
    'node-agent-surface-selected': '#bc98f7',
    'node-test-data-stroke': '#8251ee',
    'node-test-data-foreground': '#643fb2',
    'agent-native-badge-background': '#CFDDFC',
    'agent-native-badge-foreground': '#1E40AF',
  },
  dark: {
    'canvas-background': 'var(--colorNeutralBackground1)',
    'node-surface': '#141414',
    'node-surface-hover': '#292929',
    'node-surface-selected': '#292929',
    'node-border': 'var(--colorNeutralStroke3)',
    'node-border-selected': '#757575',
    'node-tile-background': '#292929',
    'node-handle-background': '#1f1f1f',
    'node-tool-connector-fill': 'var(--colorNeutralBackground4)',
    'node-agent-surface': '#1a1326',
    'node-agent-surface-hover': '#38255e',
    'node-agent-surface-selected': '#030206',
    'node-test-data-stroke': '#9263f1',
    'node-test-data-foreground': '#9263f1',
    'agent-native-badge-background': '#1B2E52',
    'agent-native-badge-foreground': '#93C5FD',
  },
} satisfies Record<string, Required<DesignerUiThemeOverrides>>;

const useStyles = makeStyles({
  root: { fontFamily: 'inherit' },
  // Forced colors repaints HTML canvas surfaces to the system Canvas color, but Chromium leaves SVG
  // backgrounds (React Flow's dotted Background) on their authored value. Mapping the canvas role to
  // Canvas keeps every surface that reads it on one system color. !important is required because the
  // palette is written inline on this same element; only enabled scopes receive this class.
  forcedColors: { '@media (forced-colors: active)': { '--designer-ui-v2-canvas-background': 'Canvas !important' } },
  outlet: { position: 'relative', zIndex: 1 },
});
const OutletContext = createContext<HTMLElement | null>(null);
export const useDesignerUiOutlet = () => useContext(OutletContext);

/** No global CSS, provider replacement, font assets or document mutation. Portals stay in this document and token scope. */
export const DesignerUiScope = forwardRef<HTMLDivElement, DesignerUiScopeProps>(function DesignerUiScope(
  { enabled = true, mode = 'light', tokens, children, className, style, ...rest },
  ref
) {
  const styles = useStyles();
  const [outlet, setOutlet] = useState<HTMLDivElement | null>(null);
  // One hover-card coordinator per scope, created once so mode/token/children rerenders keep it. A disabled
  // scope provides null (like its outlet), so cards inside it neither join this nor an ancestor's group.
  const [hoverCardGroup] = useState(createNodeHoverCardGroup);
  // Disabled scopes must write nothing: every component reads these through var() fallbacks, so an
  // empty style object is what keeps flag-off rendering identical to the pre-scope baseline.
  const scopedStyle = Object.fromEntries(
    Object.entries({ ...palettes[mode], ...tokens }).map(([name, value]) => [`--designer-ui-v2-${name}`, value])
  ) as CSSProperties;
  return (
    <div
      {...rest}
      ref={ref}
      className={mergeClasses(styles.root, enabled && styles.forcedColors, className)}
      style={{ ...(enabled ? scopedStyle : {}), ...style }}
      data-designer-ui-v2={enabled ? mode : undefined}
    >
      <OutletContext.Provider value={enabled ? outlet : null}>
        <NodeHoverCardGroupContext.Provider value={enabled ? hoverCardGroup : null}>{children}</NodeHoverCardGroupContext.Provider>
      </OutletContext.Provider>
      <div ref={setOutlet} className={styles.outlet} data-designer-ui-v2-outlet={enabled ? '' : undefined} />
    </div>
  );
});
