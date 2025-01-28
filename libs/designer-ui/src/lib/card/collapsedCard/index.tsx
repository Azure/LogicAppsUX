/* eslint-disable react/display-name */
import { css } from '@fluentui/react';
import type { MouseEventHandler } from 'react';
import { memo } from 'react';

interface CollapsedCardProps {
  id: string;
  onContextMenu?: MouseEventHandler<HTMLElement>;
}

export const CollapsedCard: React.FC<CollapsedCardProps> = memo(({ id, onContextMenu }) => {
  return <div id={id} onContextMenu={onContextMenu} className={css('msla-graph-container')} />;
});
