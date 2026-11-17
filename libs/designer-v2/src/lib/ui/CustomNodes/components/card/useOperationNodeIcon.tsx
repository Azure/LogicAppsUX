import { Spinner } from '@fluentui/react-components';
import { useState } from 'react';
import { getOperationNodeGlyph } from './operationNodeGlyphs';

/** Shared host metadata policy, without editor state or callbacks. */
export const useOperationNodeIcon = (type: string, kind?: string, iconUri?: string, isLoading = false, suppressBrand = false) => {
  const glyph = suppressBrand ? null : getOperationNodeGlyph(type, kind);
  const connectorLoading = isLoading && glyph === undefined && !iconUri;
  const [failedIconUri, setFailedIconUri] = useState<string>();
  const icon =
    glyph !== undefined ? (
      glyph?.icon
    ) : connectorLoading ? (
      <Spinner size="extra-tiny" role="presentation" />
    ) : iconUri && iconUri !== failedIconUri ? (
      <img src={iconUri} alt="" onError={() => setFailedIconUri(iconUri)} />
    ) : undefined;
  return { icon, selectedIcon: glyph?.selectedIcon, connectorLoading };
};
