import { Tooltip } from '@fluentui/react-components';
import { useOnViewportChange } from '@xyflow/react';
import { useRef } from 'react';
import { useIntl } from 'react-intl';

export interface CopyTooltipProps {
  targetRef?: React.RefObject<HTMLElement>;
  location?: { x: number; y: number };
  hideTooltip: () => void;
  id: string;
}

export const CopyTooltip = ({ targetRef: ref, location, hideTooltip, id }: CopyTooltipProps) => {
  useOnViewportChange({ onStart: () => hideTooltip() });

  const intl = useIntl();
  const copiedText = intl.formatMessage({
    defaultMessage: 'Copied!',
    id: 'NE54Uu',
    description: 'Copied text',
  });

  const locationRef = useRef<HTMLDivElement>(null);

  return (
    <Tooltip
      key={id}
      positioning={{ target: (ref ?? locationRef)?.current ?? undefined, position: 'below', align: 'start' }}
      content={copiedText}
      relationship="description"
      visible={true}
    >
      <div
        data-testid="msla-tooltip-location"
        ref={locationRef}
        style={{ width: '1px', height: '1px', position: 'absolute', top: location?.y ?? 0, left: location?.x ?? 0 }}
      />
    </Tooltip>
  );
};
