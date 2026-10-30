import { joinNodeSubtitle, NodeHoverCard, NodeInfoCard, type NodeCategory } from '@microsoft/designer-ui-v2';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent, ReactNode } from 'react';
import { defineMessages, useIntl } from 'react-intl';

const categories = defineMessages({
  trigger: { defaultMessage: 'Trigger', id: 'MGq28G', description: 'Column name for trigger type' },
  action: { defaultMessage: 'Action', id: 'arFQkD', description: 'Action category in canvas node information' },
  control: { defaultMessage: 'Control', id: 'qCj2ku', description: 'Control category in canvas node information' },
  agent: { defaultMessage: 'Agent', id: 'qn5hn7', description: 'Agent category in canvas node information' },
});

export interface SharedNodeHoverCardProps {
  children: ReactNode;
  category: NodeCategory;
  icon: ReactNode;
  title: string;
  subtitle?: string;
  configured?: boolean;
  description?: string;
  disabled?: boolean;
}

const stopPropagation = (event: MouseEvent) => event.stopPropagation();

export const SharedNodeHoverCard = memo(function SharedNodeHoverCard({
  children,
  category,
  icon,
  title,
  subtitle,
  configured,
  description,
  disabled,
}: SharedNodeHoverCardProps) {
  const intl = useIntl();
  const triggerRef = useRef<HTMLDivElement>(null);
  const [canvasFocusTarget, setCanvasFocusTarget] = useState<HTMLElement | null>(null);
  const categoryLabel = intl.formatMessage(categories[category]);
  const cardSubtitle = subtitle === categoryLabel ? categoryLabel : joinNodeSubtitle(categoryLabel, subtitle);
  const strings = useMemo(
    () => ({
      configured: intl.formatMessage({
        defaultMessage: 'Configured',
        id: 'ekrQN7',
        description: 'Label indicating that the action configuration is complete',
      }),
      close: intl.formatMessage({ defaultMessage: 'Close', id: 'Jmqafh', description: 'Dismiss canvas node information' }),
      learnMore: intl.formatMessage({
        defaultMessage: 'Learn more',
        id: 'e1d7Hc',
        description: 'Learn more about a canvas operation',
      }),
      opensInNewTab: intl.formatMessage({
        defaultMessage: 'Opens in a new tab',
        id: '+zzN1a',
        description: 'Canvas node information link opens in a new tab',
      }),
    }),
    [intl]
  );
  useEffect(() => {
    setCanvasFocusTarget(triggerRef.current?.closest<HTMLElement>('.react-flow__node') ?? null);
  }, []);
  const renderCard = useCallback(
    (close: () => void) => (
      <div onClick={stopPropagation} onDoubleClick={stopPropagation}>
        <NodeInfoCard
          category={category}
          icon={icon}
          title={title}
          subtitle={cardSubtitle}
          configured={configured}
          description={description}
          onDismiss={close}
          strings={strings}
        />
      </div>
    ),
    [category, icon, title, cardSubtitle, configured, description, strings]
  );
  return (
    <NodeHoverCard card={renderCard} disabled={disabled} externalFocusTarget={canvasFocusTarget} triggerRef={triggerRef}>
      {children}
    </NodeHoverCard>
  );
});
