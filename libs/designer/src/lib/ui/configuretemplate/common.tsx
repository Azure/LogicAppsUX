import { Text, MessageBar, MessageBarTitle, MessageBarBody } from '@fluentui/react-components';

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
        <a style={{ paddingLeft: 5 }} href={linkUrl}>
          {linkText}
        </a>
      ) : null}
    </p>
  );
};

export const ErrorBar = ({ title, errorMessage, styles }: { title?: string; errorMessage: string; styles?: React.CSSProperties }) => {
  return (
    <MessageBar intent="error" className="msla-templates-error-message-bar" style={styles}>
      <MessageBarBody>
        {title ? <MessageBarTitle>{title}</MessageBarTitle> : null}
        <Text>{errorMessage}</Text>
      </MessageBarBody>
    </MessageBar>
  );
};

export const tableHeaderStyle = { fontWeight: 600 };
