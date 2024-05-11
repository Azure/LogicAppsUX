// With Migrating from v8 to v9 components we can't style the components with className or varients
import { Text } from '@fluentui/react-components';
import type { CSSProperties } from 'react';
export const SmallText = ({ text, style }: { text: string; style?: CSSProperties }) => {
  return (
    <Text size={200} weight={'regular'} style={style}>
      {text}
    </Text>
  );
};
