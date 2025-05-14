import { Text } from '@fluentui/react-components';

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

export const tableHeaderStyle = { fontWeight: 600 };
