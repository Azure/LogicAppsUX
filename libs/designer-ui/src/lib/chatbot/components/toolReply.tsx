import { Link } from '@fluentui/react-components';
import type { ToolReplyItem } from './conversationItem';
import Markdown from 'react-markdown';
import { useRef } from 'react';

export const ToolReply = ({ item }: { item: ToolReplyItem }) => {
  const { text, onClick, id, status } = item;
  const textRef = useRef<HTMLDivElement | null>(null);
  return (
    <div ref={textRef}>
      {onClick ? (
        <div className="msla-system-message-link">
          <Link onClick={() => onClick(id, text)} inline>
            <Markdown>{text}</Markdown>{' '}
          </Link>
          {!!status && (
            <>
              <p>-</p>
              <Markdown>{status}</Markdown>
            </>
          )}
        </div>
      ) : (
        <div className="msla-system-message">
          <Markdown>{text}</Markdown>
          {!!status && (
            <>
              <p>-</p>
              <Markdown>{status}</Markdown>
            </>
          )}
        </div>
      )}
    </div>
  );
};
