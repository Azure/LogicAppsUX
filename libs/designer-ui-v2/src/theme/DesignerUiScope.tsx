import { createContext, forwardRef, useContext, useState } from 'react';
import type { CSSProperties, HTMLAttributes } from 'react';
import { makeStyles, mergeClasses } from '@fluentui/react-components';

export type DesignerUiThemeOverrides = Partial<
  Record<
    | 'node-surface'
    | 'node-surface-hover'
    | 'node-surface-selected'
    | 'node-border-selected'
    | 'node-tile-background'
    | 'node-handle-background'
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

const palettes = {
  light: {
    'node-surface': '#f5f5f5',
    'node-surface-hover': '#ebebeb',
    'node-surface-selected': '#ffffff',
    'node-border-selected': '#8a8a8a',
    'node-tile-background': '#fcfcfc',
    'node-handle-background': '#fafafa',
    'node-agent-surface': '#e1cefc',
    'node-agent-surface-hover': '#d5bcfb',
    'node-agent-surface-selected': '#bc98f7',
    'node-test-data-stroke': '#8251ee',
    'node-test-data-foreground': '#643fb2',
    'agent-native-badge-background': '#CFDDFC',
    'agent-native-badge-foreground': '#1E40AF',
  },
  dark: {
    'node-surface': '#141414',
    'node-surface-hover': '#292929',
    'node-surface-selected': '#292929',
    'node-border-selected': '#757575',
    'node-tile-background': '#292929',
    'node-handle-background': '#1f1f1f',
    'node-agent-surface': '#1a1326',
    'node-agent-surface-hover': '#38255e',
    'node-agent-surface-selected': '#030206',
    'node-test-data-stroke': '#9263f1',
    'node-test-data-foreground': '#9263f1',
    'agent-native-badge-background': '#1B2E52',
    'agent-native-badge-foreground': '#93C5FD',
  },
} satisfies Record<string, Required<DesignerUiThemeOverrides>>;

const useStyles = makeStyles({ root: { fontFamily: 'inherit' }, outlet: { position: 'relative', zIndex: 1 } });
const OutletContext = createContext<HTMLElement | null>(null);
export const useDesignerUiOutlet = () => useContext(OutletContext);

/** No global CSS, provider replacement, font assets or document mutation. Portals stay in this document and token scope. */
export const DesignerUiScope = forwardRef<HTMLDivElement, DesignerUiScopeProps>(function DesignerUiScope(
  { enabled = true, mode = 'light', tokens, children, className, style, ...rest },
  ref
) {
  const styles = useStyles();
  const [outlet, setOutlet] = useState<HTMLDivElement | null>(null);
  const scopedStyle = Object.fromEntries(
    Object.entries({ ...palettes[mode], ...tokens }).map(([name, value]) => [`--designer-ui-v2-${name}`, value])
  ) as CSSProperties;
  return (
    <div
      {...rest}
      ref={ref}
      className={mergeClasses(styles.root, className)}
      style={{ ...(enabled ? scopedStyle : {}), ...style }}
      data-designer-ui-v2={enabled ? mode : undefined}
    >
      <OutletContext.Provider value={enabled ? outlet : null}>{children}</OutletContext.Provider>
      <div ref={setOutlet} className={styles.outlet} data-designer-ui-v2-outlet={enabled ? '' : undefined} />
    </div>
  );
});
