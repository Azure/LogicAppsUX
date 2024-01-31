import { isEnterKey, isSpaceKey } from '../utils';
import type { NodeMessage } from './errorsPanel.types';
import { MessageLevel } from './errorsPanel.types';
import { Text, Icon } from '@fluentui/react';
import { fallbackConnectorIconUrl } from '@microsoft/utils-logic-apps';
import { useIntl } from 'react-intl';

interface NodeErrorCardProps {
  id: string;
  level: MessageLevel;
  title: string;
  brandColor: string;
  iconUri?: string;
  onClick?(): void;
  messagesBySubtitle?: Record<string, NodeMessage[]>;
}

export const NodeErrorCard: React.FC<NodeErrorCardProps> = ({ id, level, title, iconUri, onClick, messagesBySubtitle }) => {
  const intl = useIntl();

  const handleClick: React.MouseEventHandler<HTMLElement> = (e) => {
    e.stopPropagation();
    onClick?.();
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLElement> = (e) => {
    if (isEnterKey(e) || isSpaceKey(e)) {
      e.stopPropagation();
      onClick?.();
    }
  };

  const buttonHint = intl.formatMessage({
    defaultMessage: 'Open operation',
    description: 'Hint for the button on the error card',
  });

  return (
    <div key={id} className="msla-error-card" onClick={handleClick} tabIndex={0} onKeyDown={handleKeyDown}>
      <div className="msla-error-card-header">
        <img className="panel-card-icon" src={fallbackConnectorIconUrl(iconUri)} alt="" />
        <span className="msla-error-card-title">{title}</span>
        <span className="msla-error-card-button-hint">
          {buttonHint}
          <Icon iconName="ChevronRight" style={{ marginLeft: '8px' }} />
        </span>
      </div>
      <div className="msla-error-card-body">
        {Object.entries(messagesBySubtitle ?? {}).map(([subtitle, values]) => (
          <ErrorSubsection key={subtitle} level={level} subtitle={subtitle} messages={values} />
        ))}
      </div>
    </div>
  );
};

interface ErrorSubsectionProps {
  level: MessageLevel;
  subtitle: string;
  messages: NodeMessage[];
}

const ErrorSubsection = (props: ErrorSubsectionProps) => {
  const { level, subtitle, messages } = props;

  // create new messages array with no empty values
  const filteredMessages = messages?.filter((m: NodeMessage) => m.content);
  if (!filteredMessages?.length) return null;

  return (
    <div className="msla-error-card-subsection">
      <span className="msla-error-card-subtitle">{subtitle}</span>
      {messages.map((m: NodeMessage) => (
        <div key={m.content}>
          <div className={level === MessageLevel.Warning ? 'msla-warning-dot' : 'msla-error-dot'} />
          <Text key={m.content} variant="medium">
            {m.content}
          </Text>
          {m.onRenderDetails?.()}
        </div>
      ))}
    </div>
  );
};
