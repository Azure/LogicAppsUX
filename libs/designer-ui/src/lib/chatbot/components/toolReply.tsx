import { useRef } from 'react';
import type { ToolReplyItem } from './conversationItem';
import Markdown from 'react-markdown';

export const ToolReply = ({ item }: { item: ToolReplyItem }) => {
  const { text } = item;
  const textRef = useRef<HTMLDivElement | null>(null);
  return (
    <div ref={textRef}>
      <Markdown className="msla-system-message">{text}</Markdown>
    </div>
  );
};
