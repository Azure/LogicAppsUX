import { joinNodeSubtitle, NodeHoverCard, NodeInfoCard, type NodeCategory } from '@microsoft/designer-ui-v2';
import { Button } from '@fluentui/react-components';
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
  className?: string;
  category: NodeCategory;
  icon: ReactNode;
  title: string;
  subtitle?: string;
  configured?: boolean;
  description?: string;
  disabled?: boolean;
  testDataEnabled?: boolean;
  onEditTestData?: () => void;
}

const stopPropagation = (event: MouseEvent) => event.stopPropagation();

const getCanvasObstacles = (trigger: HTMLElement): DOMRectReadOnly[] => {
  const canvas = trigger.closest('.react-flow');
  const self = trigger.closest('.react-flow__node');
  // Flow frames can contain entire branches; avoid their cards and controls, not the decorative frame bounds.
  return Array.from(
    canvas?.querySelectorAll('[data-node-card][id^="msla-node-"], [data-edge-control], .react-flow__controls, .react-flow__minimap') ?? []
  )
    .filter((element) => !self?.contains(element) && element.checkVisibility?.() !== false)
    .map((element) => element.getBoundingClientRect())
    .filter(({ width, height }) => width > 0 && height > 0);
};

export const SharedNodeHoverCard = memo(function SharedNodeHoverCard({
  children,
  className,
  category,
  icon,
  title,
  subtitle,
  configured,
  description,
  disabled,
  testDataEnabled,
  onEditTestData,
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
          wrapTitle
          subtitle={cardSubtitle}
          configured={configured}
          description={description}
          onDismiss={close}
          strings={strings}
          testData={testDataEnabled ? {} : undefined}
          footer={
            onEditTestData ? (
              <Button
                appearance="subtle"
                size="small"
                onClick={() => {
                  close();
                  onEditTestData();
                }}
              >
                {intl.formatMessage({
                  defaultMessage: 'Edit test data',
                  id: 'Ak8mfG',
                  description: 'Open the selected action’s Testing tab',
                })}
              </Button>
            ) : undefined
          }
        />
      </div>
    ),
    [category, icon, title, cardSubtitle, configured, description, strings, testDataEnabled, onEditTestData, intl]
  );
  return (
    <NodeHoverCard
      className={className}
      card={renderCard}
      disabled={disabled}
      placement="side"
      getObstacles={getCanvasObstacles}
      externalFocusTarget={canvasFocusTarget}
      triggerRef={triggerRef}
    >
      {children}
    </NodeHoverCard>
  );
});
