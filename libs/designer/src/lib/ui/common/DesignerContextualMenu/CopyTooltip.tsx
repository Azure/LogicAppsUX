/* eslint-disable react/display-name */
import { Tooltip } from '@fluentui/react-components';
import { useOnViewportChange } from '@xyflow/react';
import { useMemo, useRef } from 'react';
import { useIntl } from 'react-intl';

export interface CopyTooltipProps {
  targetRef?: React.RefObject<HTMLElement>;
  location?: { x: number; y: number };
  hideTooltip: () => void;
}

export const CopyTooltip = ({ targetRef: ref, location, hideTooltip }: CopyTooltipProps) => {
  useOnViewportChange({ onStart: hideTooltip });

  const intl = useIntl();
  const copiedText = intl.formatMessage({
    defaultMessage: 'Copied!',
    id: 'NE54Uu',
    description: 'Copied text',
  });

  const locationRef = useRef<HTMLDivElement>(null);

  const TooltipComponent = useMemo(
    () => () => (
      <Tooltip
        positioning={{ target: (ref ?? locationRef)?.current, position: 'below', align: 'start' }}
        content={copiedText}
        relationship="description"
        visible={true}
      />
    ),
    [copiedText, ref]
  );

  return (
    <div ref={locationRef} style={{ position: 'absolute', top: location?.y ?? 0, left: location?.x ?? 0 }}>
      <TooltipComponent />
    </div>
  );
};
