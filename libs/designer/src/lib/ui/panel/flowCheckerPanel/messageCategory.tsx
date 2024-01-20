import { MessageLevel } from '@microsoft/designer-ui';
import { useState } from 'react';

type MessageCategoryProps = {
  title: string;
  level: MessageLevel;
  numMessages: number;
  children: React.ReactNode;
};

export const MessageCategory = (props: MessageCategoryProps) => {
  const { title, level, numMessages, children } = props;

  const [isExpanded, setIsExpanded] = useState(true);

  if (numMessages === 0) return null;

  return (
    <div className="msla-message-category-container">
      <div className="msla-message-category-header" onClick={() => setIsExpanded(!isExpanded)}>
        <span className={level === MessageLevel.Warning ? 'msla-warning-number-dot' : 'msla-error-number-dot'}>{numMessages}</span>
        <span className="msla-message-category-title">{title}</span>
      </div>
      {isExpanded ? <div className="msla-message-category-body">{children}</div> : null}
    </div>
  );
};
