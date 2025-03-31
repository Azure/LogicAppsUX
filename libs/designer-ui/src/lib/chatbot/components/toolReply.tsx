import { Link } from '@fluentui/react-components';
import type { ToolReplyItem } from './conversationItem';
import { useIntl } from 'react-intl';

export const ToolReply = ({ item }: { item: ToolReplyItem }) => {
  const { text, onClickCallback } = item;
  const intl = useIntl();

  const executedToolText = intl.formatMessage({
    defaultMessage: 'got executed',
    id: 'jk272j',
    description: 'Text to show when a tool is executed',
  });

  return (
    <div style={{ margin: '10px 0' }}>
      <Link onClick={onClickCallback}>{text}</Link> {executedToolText}
    </div>
  );
};
