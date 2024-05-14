import { Text } from '@fluentui/react-components';
import type { CSSProperties } from 'react';

const BuiltInText = ({
  text,
  size,
  weight,
  style,
}: {
  text: string;
  size: 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 1000;
  weight: 'regular' | 'medium' | 'semibold' | 'bold';
  style?: CSSProperties;
}) => {
  return (
    <Text size={size} weight={weight} style={style}>
      {text}
    </Text>
  );
};

export const XLargeText = ({ text, style }: { text: string; style?: CSSProperties }) => {
  return <BuiltInText text={text} size={500} weight={'medium'} style={style} />;
};
export const MediumText = ({ text, style }: { text: string; style?: CSSProperties }) => {
  return <BuiltInText text={text} size={300} weight={'regular'} style={style} />;
};
export const SmallText = ({ text, style }: { text: string; style?: CSSProperties }) => {
  return <BuiltInText text={text} size={200} weight={'regular'} style={style} />;
};
