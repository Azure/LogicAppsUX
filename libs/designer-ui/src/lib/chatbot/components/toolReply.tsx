import { useRef } from 'react';
import { ContainerWithProgressBar } from './containerWithProgressBar';
import type { ToolReplyItem } from './conversationItem';
import Markdown from 'react-markdown';

export const ToolReply = ({ item }: { item: ToolReplyItem }) => {
  const { text } = item;
  const textRef = useRef<HTMLDivElement | null>(null);
  return (
    <div>
      <ContainerWithProgressBar dataAutomationId={'dataAutomationId'}>
        <div ref={textRef}>
          <Markdown>{text}</Markdown>
        </div>
      </ContainerWithProgressBar>
    </div>
  );
};
