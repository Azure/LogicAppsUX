import { useRef } from 'react';
import type { ToolReplyItem } from './conversationItem';
import Markdown from 'react-markdown';
import { Link } from '@fluentui/react-components';

export const ToolReply = ({ item }: { item: ToolReplyItem }) => {
  const { text, onClick, id } = item;
  const textRef = useRef<HTMLDivElement | null>(null);
  return (
    <div ref={textRef}>
      {onClick ? (
        <Link onClick={() => onClick(id, text)}>
          <Markdown className="msla-system-message">{text}</Markdown>
        </Link>
      ) : (
        <Markdown className="msla-system-message">{text}</Markdown>
      )}
    </div>
  );
};
