import { Spinner } from '@fluentui/react-components';
import { PlugConnectedFilled, PlugConnectedRegular } from '@fluentui/react-icons';
import type { NodeIconTone } from '@microsoft/designer-ui-v2';
import { type ReactNode, useState } from 'react';
import { getOperationNodeGlyph } from './operationNodeGlyphs';

export interface OperationNodeIcon {
  icon: ReactNode;
  selectedIcon?: ReactNode;
  tone?: NodeIconTone;
  /** True when `icon` is host connector art that the tile must render untinted. */
  artwork: boolean;
  connectorLoading: boolean;
}

/**
 * Shared host icon policy, without editor state or callbacks. Precedence:
 * 1. Mapped built-ins keep their designed glyph in a family color.
 * 2. Resolved connector, MCP or unmapped built-in art renders untinted.
 * 3. A spinner shows only while metadata is still loading and no art exists yet.
 * 4. Connectors without art (for example failed metadata) get a neutral connector mark, never the built-in bolt.
 * 5. Unmapped built-ins without art fall back to the card's category glyph.
 */
export const useOperationNodeIcon = (type: string, kind?: string, iconUri?: string, isLoading = false): OperationNodeIcon => {
  const glyph = getOperationNodeGlyph(type, kind);
  const [failedIconUri, setFailedIconUri] = useState<string>();
  if (glyph) {
    return { icon: glyph.icon, selectedIcon: glyph.selectedIcon, tone: glyph.tone, artwork: false, connectorLoading: false };
  }
  if (iconUri && iconUri !== failedIconUri) {
    return {
      icon: <img src={iconUri} alt="" onError={() => setFailedIconUri(iconUri)} />,
      artwork: true,
      connectorLoading: false,
    };
  }
  if (isLoading && !iconUri) {
    return { icon: <Spinner size="extra-tiny" role="presentation" />, artwork: false, connectorLoading: true };
  }
  if (glyph === undefined) {
    return {
      icon: <PlugConnectedRegular />,
      selectedIcon: <PlugConnectedFilled />,
      tone: 'neutral',
      artwork: false,
      connectorLoading: false,
    };
  }
  return { icon: undefined, artwork: false, connectorLoading: false };
};
