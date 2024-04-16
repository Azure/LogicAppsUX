import { MessageLevel } from '@microsoft/designer-ui';
import { useState } from 'react';

type ErrorCategoryProps = {
  title: string;
  level: MessageLevel;
  numMessages: number;
  children: React.ReactNode;
};

export const ErrorCategory = (props: ErrorCategoryProps) => {
  const { title, level, numMessages, children } = props;

  const [isExpanded, setIsExpanded] = useState(true);

  if (numMessages === 0) {
    return null;
  }

  return (
    <div className="msla-error-category-container">
      <div className="msla-error-category-header" onClick={() => setIsExpanded(!isExpanded)}>
        <span className={level === MessageLevel.Warning ? 'msla-warning-number-dot' : 'msla-error-number-dot'}>{numMessages}</span>
        <span className="msla-error-category-title">{title}</span>
      </div>
      {isExpanded ? <div className="msla-error-category-body">{children}</div> : null}
    </div>
  );
};
