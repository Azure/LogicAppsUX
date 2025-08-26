import { Button } from '@fluentui/react-components';
import { MessageLevel } from '@microsoft/designer-ui';
import { useState } from 'react';
import { bundleIcon, ChevronDown24Filled, ChevronDown24Regular, ChevronRight24Filled, ChevronRight24Regular } from '@fluentui/react-icons';

type ErrorCategoryProps = {
  title: string;
  level: MessageLevel;
  numMessages: number;
  children: React.ReactNode;
};

const ExpandIcon = bundleIcon(ChevronRight24Filled, ChevronRight24Regular);
const CollapseIcon = bundleIcon(ChevronDown24Filled, ChevronDown24Regular);

export const ErrorCategory = (props: ErrorCategoryProps) => {
  const { title, level, numMessages, children } = props;

  const [isExpanded, setIsExpanded] = useState(true);

  if (numMessages === 0) {
    return null;
  }

  return (
    <div className="msla-error-category-container">
      <Button
        appearance="subtle"
        className="msla-error-category-header"
        onClick={() => setIsExpanded(!isExpanded)}
        icon={isExpanded ? <CollapseIcon /> : <ExpandIcon />}
        aria-expanded={isExpanded}
        style={{ justifyContent: 'flex-start', width: '100%' }}
      >
        <span className={level === MessageLevel.Warning ? 'msla-warning-number-dot' : 'msla-error-number-dot'}>{numMessages}</span>
        <span className="msla-error-category-title">{title}</span>
      </Button>
      {isExpanded ? <div className="msla-error-category-body">{children}</div> : null}
    </div>
  );
};
