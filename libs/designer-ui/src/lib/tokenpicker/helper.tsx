import TokenPicker from '.';
import type { TokenGroup } from './models/token';

export const GetTokenPicker = (
  editorId: string,
  labelId: string,
  tokenGroup?: TokenGroup[],
  expressionGroup?: TokenGroup[],
  onClick?: (b: boolean) => void
): JSX.Element => {
  // check to see if there's a custom Token Picker
  return (
    <TokenPicker
      editorId={editorId}
      labelId={labelId}
      tokenGroup={tokenGroup}
      expressionGroup={expressionGroup}
      setInTokenPicker={onClick}
      initialExpression={''}
    />
  );
};
