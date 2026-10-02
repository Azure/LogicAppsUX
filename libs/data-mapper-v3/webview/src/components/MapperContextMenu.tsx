import { FluentProvider, MenuItem, MenuList, makeStyles, tokens } from '@fluentui/react-components';
// biome-ignore lint/style/useImportType: The classic JSX transform requires React at runtime.
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { getVsCodeFluentTheme, useTypographyStyles } from '../fluentTheme';

export interface ContextMenuItem {
  label: string;
  shortcut?: string;
  disabled?: boolean;
  divider?: boolean;
  action(): void;
}

export interface ContextMenuCallbacks {
  onClose(): void;
}

const useStyles = makeStyles({
  surface: {
    minWidth: '200px',
    backgroundColor: tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    borderRadius: tokens.borderRadiusMedium,
    boxShadow: tokens.shadow16,
    padding: tokens.spacingVerticalXS,
  },
  item: { display: 'flex', justifyContent: 'space-between', gap: tokens.spacingHorizontalL },
  shortcut: { color: tokens.colorNeutralForeground3 },
});

function ContextMenuView({ items, onClose }: { items: ContextMenuItem[] } & ContextMenuCallbacks): React.ReactElement {
  const styles = useStyles();
  const typographyStyles = useTypographyStyles();
  return (
    <FluentProvider theme={getVsCodeFluentTheme()} style={{ display: 'contents' }}>
      <MenuList className={`${styles.surface} ${typographyStyles.base}`}>
        {items.map((item, index) =>
          item.divider ? (
            <div key={`divider-${index}`} role="separator" />
          ) : (
            <MenuItem
              key={item.label}
              disabled={item.disabled}
              onClick={() => {
                onClose();
                item.action();
              }}
            >
              <span className={styles.item}>
                <span>{item.label}</span>
                {item.shortcut ? <span className={styles.shortcut}>{item.shortcut}</span> : null}
              </span>
            </MenuItem>
          )
        )}
      </MenuList>
    </FluentProvider>
  );
}

export class MapperContextMenu extends HTMLElement {
  private reactRoot: Root | null = null;
  private items: ContextMenuItem[] = [];
  private onClose: () => void = () => {};

  public configure(items: ContextMenuItem[], onClose: () => void): void {
    this.items = items;
    this.onClose = onClose;
    this.renderReact();
  }

  public connectedCallback(): void {
    this.renderReact();
  }

  public disconnectedCallback(): void {
    this.reactRoot?.unmount();
    this.reactRoot = null;
  }

  private renderReact(): void {
    if (!this.isConnected) {
      return;
    }
    this.reactRoot ??= createRoot(this);
    this.reactRoot.render(<ContextMenuView items={this.items} onClose={this.onClose} />);
  }
}

customElements.define('biztalk-mapper-context-menu', MapperContextMenu);

declare global {
  interface HTMLElementTagNameMap {
    'biztalk-mapper-context-menu': MapperContextMenu;
  }
}
