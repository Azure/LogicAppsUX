import { customTokens } from '../../core';
import type { FunctionData } from '../../models/Function';
import { getFunctionBrandingForCategory } from '../../utils/Function.Utils';
import { getIconForFunction } from '../../utils/Icon.Utils';
import { DMTooltip } from '../tooltip/tooltip';
import { Button, Caption1, makeStyles, shorthands, tokens, typographyStyles } from '@fluentui/react-components';

const useCardStyles = makeStyles({
  button: {
    width: '100%',
    height: '40px',
    backgroundColor: tokens.colorNeutralBackground1,
    display: 'flex',
    justifyContent: 'left',
    ...shorthands.border('0px'),
    ...shorthands.padding('1px 4px 1px 4px'),
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
  text: {
    width: '180px',
    paddingLeft: '4px',
    paddingRight: '4px',
    ...shorthands.overflow('hidden'),
    ':hover': {
      ...typographyStyles.caption1Strong,
    },
  },
});

const fnIconSize = '28px';

interface FunctionListCellProps {
  functionData: FunctionData;
  onFunctionClick: (functionNode: FunctionData) => void;
}

const FunctionListCell = ({ functionData, onFunctionClick }: FunctionListCellProps) => {
  const cardStyles = useCardStyles();
  const branding = getFunctionBrandingForCategory(functionData.category);

  return (
    <Button
      key={functionData.key}
      alt-text={functionData.displayName}
      className={cardStyles.button}
      onClick={() => {
        onFunctionClick(functionData);
      }}
    >
      <span
        style={{
          backgroundColor: customTokens[branding.colorTokenName],
          height: fnIconSize,
          width: fnIconSize,
          borderRadius: '50%',
        }}
      >
        <div style={{ paddingTop: '4px', color: tokens.colorNeutralBackground1 }}>
          {
            getIconForFunction(
              functionData.displayName,
              undefined,
              branding
            ) /* TODO: undefined -> functionData.iconFileName once all SVGs in */
          }
        </div>
      </span>
      <Caption1 truncate block className={cardStyles.text}>
        {functionData.displayName}
      </Caption1>
      <span style={{ justifyContent: 'right' }}>
        <DMTooltip text={functionData.description} />
      </span>
    </Button>
  );
};

export default FunctionListCell;
