import { Link } from '@fluentui/react-components';
import type { ToolReplyItem } from './conversationItem';
import Markdown from 'react-markdown';
import { useRef } from 'react';
import { Failed, Handoff, Skipped, Succeeded, TimedOut } from '../../monitoring/statuspill/images';
import { idDisplayCase, RUN_AFTER_STATUS } from '@microsoft/logic-apps-shared';

export const ToolReply = ({ item }: { item: ToolReplyItem }) => {
  const { text, onClick, id, status, dataScrollTarget } = item;
  const textRef = useRef<HTMLDivElement | null>(null);

  const badge: Record<string, JSX.Element> = {
    [RUN_AFTER_STATUS.SUCCEEDED]: <Succeeded />,
    [RUN_AFTER_STATUS.SKIPPED]: <Skipped />,
    [RUN_AFTER_STATUS.FAILED]: <Failed />,
    [RUN_AFTER_STATUS.TIMEDOUT]: <TimedOut />,
    [RUN_AFTER_STATUS.HANDOFF]: <Handoff />,
  };

  return (
    <div data-scroll-target={dataScrollTarget} ref={textRef}>
      {onClick ? (
        <div className="msla-system-message-link">
          {!!status && <div className="msla-run-after-label-badge">{badge[status.toUpperCase()]}</div>}
          <Link onClick={() => onClick(id, text)} inline>
            <Markdown>{text}</Markdown>{' '}
          </Link>
        </div>
      ) : (
        <div className="msla-system-message">
          {!!status && <div className="msla-run-after-label-badge">{badge[status.toUpperCase()]}</div>}
          <Markdown>{idDisplayCase(text)}</Markdown>
        </div>
      )}
    </div>
  );
};
