import { Text } from '@fluentui/react-components';
import type { CSSProperties } from 'react';

export interface TextProps {
  text: string;
  style?: CSSProperties;
  className?: string;
}

interface BuiltInTextProps extends TextProps {
  size: 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 1000;
  weight: 'regular' | 'medium' | 'semibold' | 'bold';
}

const BuiltInText = ({ text, size, weight, style, className }: BuiltInTextProps) => {
  return (
    <Text size={size} weight={weight} style={style} className={className}>
      {text}
    </Text>
  );
};

export const XXLargeText = ({ text, style, className }: TextProps) => {
  return <BuiltInText text={text} size={700} weight={'semibold'} style={style} className={className} />;
};
export const XLargeText = ({ text, style, className }: TextProps) => {
  return <BuiltInText text={text} size={500} weight={'medium'} style={style} className={className} />;
};
export const LargeText = ({ text, style, className }: TextProps) => {
  return <BuiltInText text={text} size={400} weight={'regular'} style={style} className={className} />;
};
export const MediumText = ({ text, style, className }: TextProps) => {
  return <BuiltInText text={text} size={300} weight={'regular'} style={style} className={className} />;
};
export const SmallText = ({ text, style, className }: TextProps) => {
  return <BuiltInText text={text} size={200} weight={'regular'} style={style} className={className} />;
};
