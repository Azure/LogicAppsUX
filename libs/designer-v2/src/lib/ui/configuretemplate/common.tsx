import { Text, MessageBar, MessageBarTitle, MessageBarBody, Link } from '@fluentui/react-components';

export const DescriptionWithLink = ({
  text,
  linkText,
  linkUrl,
  className,
}: { text: string; linkText?: string; linkUrl?: string; className?: string }) => {
  return (
    <p className={className}>
      <Text>{text}</Text>
      {linkUrl ? (
        <Link style={{ paddingLeft: 5 }} href={linkUrl} target="_blank">
          {linkText}
        </Link>
      ) : null}
    </p>
  );
};

export const ErrorBar = ({
  title,
  errorMessage,
  styles,
  messageInNewline,
}: { title?: string; errorMessage: string; messageInNewline?: boolean; styles?: React.CSSProperties }) => {
  return (
    <MessageBar intent="error" className="msla-templates-error-message-bar" style={styles}>
      <MessageBarBody>
        {title ? <MessageBarTitle>{title}</MessageBarTitle> : null}
        {messageInNewline ? <br /> : null}
        <Text>{errorMessage}</Text>
      </MessageBarBody>
    </MessageBar>
  );
};

export const tableHeaderStyle = { fontWeight: 600 };
