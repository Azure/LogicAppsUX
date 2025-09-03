import { Link, Text, tokens } from '@fluentui/react-components';
import type { ToolReplyItem } from './conversationItem';
import Markdown from 'react-markdown';
import { useMemo, useRef } from 'react';
import { Failed, Handoff, Skipped, Succeeded, TimedOut } from '../../monitoring/statuspill/images';
import { idDisplayCase, RUN_AFTER_STATUS } from '@microsoft/logic-apps-shared';
import { useIntl } from 'react-intl';

const badge: Record<string, JSX.Element> = {
  [RUN_AFTER_STATUS.SUCCEEDED]: <Succeeded />,
  [RUN_AFTER_STATUS.SKIPPED]: <Skipped />,
  [RUN_AFTER_STATUS.FAILED]: <Failed />,
  [RUN_AFTER_STATUS.TIMEDOUT]: <TimedOut />,
  [RUN_AFTER_STATUS.HANDOFF]: <Handoff />,
};

export const ToolReply = ({ item }: { item: ToolReplyItem }) => {
  const { text, onClick, id, status, dataScrollTarget, date } = item;
  const intl = useIntl();
  const textRef = useRef<HTMLDivElement | null>(null);

  const replyTime = useMemo(() => {
    if (!date) {
      return null;
    }
    const time = intl.formatTime(date, {
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: true,
    });
    return (
      <Text size={200} style={{ color: tokens.colorNeutralForeground4 }}>
        {time}
      </Text>
    );
  }, [date, intl]);

  return (
    <div data-scroll-target={dataScrollTarget} ref={textRef}>
      {onClick ? (
        <>
          <div className="msla-system-message-link">
            {!!status && <div className="msla-run-after-label-badge">{badge[status.toUpperCase()]}</div>}
            <Link onClick={() => onClick(id, text)} inline>
              <Markdown>{text}</Markdown>{' '}
            </Link>
          </div>
          {replyTime}
        </>
      ) : (
        <>
          <div className="msla-system-message">
            {!!status && <div className="msla-run-after-label-badge">{badge[status.toUpperCase()]}</div>}
            <Markdown>{idDisplayCase(text)}</Markdown>
          </div>
          {replyTime}
        </>
      )}
    </div>
  );
};
