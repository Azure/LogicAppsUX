import { Link } from '@fluentui/react-components';
import type { AgentHeaderItem } from './conversationItem';
import Markdown from 'react-markdown';

export const AgentHeader = ({ item }: { item: AgentHeaderItem }) => {
  const { text, onClick, id } = item;
  const agentHeaderIcon =
    'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiBpZD0idXVpZC1hOTNkNmI0YS02N2Y2LTQ1MjAtODNhOS0yMGIwZGJlMjQ1Y2YiIGRhdGEtbmFtZT0iTGF5ZXIgMSIgd2lkdGg9IjE4IiBoZWlnaHQ9IjE4IiB2aWV3Qm94PSIwIDAgMTggMTgiPg0KICA8ZGVmcz4NCiAgICA8cmFkaWFsR3JhZGllbnQgaWQ9InV1aWQtMGJmODYwMGYtNmQ3ZC00OTZmLWE1ZGMtZDJhZjg2ZGQ2NGNmIiBjeD0iLTY3Ljk4MSIgY3k9Ijc5My4xOTkiIGZ4PSItNjcuOTgxIiBmeT0iNzkzLjE5OSIgcj0iLjQ1IiBncmFkaWVudFRyYW5zZm9ybT0idHJhbnNsYXRlKC0xNzkzOS4wMyAyMDM2OC4wMjkpIHJvdGF0ZSg0NSkgc2NhbGUoMjUuMDkxIC0zNC4xNDkpIiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+DQogICAgICA8c3RvcCBvZmZzZXQ9IjAiIHN0b3AtY29sb3I9IiM4M2I5ZjkiLz4NCiAgICAgIDxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzAwNzhkNCIvPg0KICAgIDwvcmFkaWFsR3JhZGllbnQ+DQogIDwvZGVmcz4NCiAgPHBhdGggZD0ibTAsMi43djEyLjZjMCwxLjQ5MSwxLjIwOSwyLjcsMi43LDIuN2gxMi42YzEuNDkxLDAsMi43LTEuMjA5LDIuNy0yLjdWMi43YzAtMS40OTEtMS4yMDktMi43LTIuNy0yLjdIMi43QzEuMjA5LDAsMCwxLjIwOSwwLDIuN1pNMTAuOCwwdjMuNmMwLDMuOTc2LDMuMjI0LDcuMiw3LjIsNy4yaC0zLjZjLTMuOTc2LDAtNy4xOTksMy4yMjItNy4yLDcuMTk4di0zLjU5OGMwLTMuOTc2LTMuMjI0LTcuMi03LjItNy4yaDMuNmMzLjk3NiwwLDcuMi0zLjIyNCw3LjItNy4yWiIgZmlsbD0idXJsKCN1dWlkLTBiZjg2MDBmLTZkN2QtNDk2Zi1hNWRjLWQyYWY4NmRkNjRjZikiIGZpbGwtcnVsZT0iZXZlbm9kZCIgc3Ryb2tlLXdpZHRoPSIwIi8+DQo8L3N2Zz4=';
  return (
    <div className="msla-chat-agent-header">
      <img className="msla-chat-agent-header-icon" alt="Agent icon" src={agentHeaderIcon} />
      {onClick ? (
        <Link onClick={() => onClick(id, text)}>
          <Markdown>{text}</Markdown>
        </Link>
      ) : (
        <Markdown>{text}</Markdown>
      )}
    </div>
  );
};
