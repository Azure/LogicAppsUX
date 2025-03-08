import { customTokens } from '../../core';
import type { FunctionData } from '../../models/Function';
import { getFunctionBrandingForCategory } from '../../utils/Function.Utils';
import { FunctionIcon } from '../functionIcon/FunctionIcon';
import { DMTooltip } from '../tooltip/tooltip';
import { Button, Caption1, makeStyles, shorthands, tokens, typographyStyles } from '@fluentui/react-components';

const fnIconSize = '28px';

const useCardStyles = makeStyles({
  button: {
    height: '40px',
    backgroundColor: tokens.colorNeutralBackground1,
    display: 'flex',
    ...shorthands.border('0px'),
    ...shorthands.padding('1px 4px 1px 4px'),
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
    '&:hover .fui-Text': {
      ...typographyStyles.caption1Strong,
    },
  },
  iconContainer: {
    height: fnIconSize,
    flexShrink: '0 !important',
    flexBasis: fnIconSize,
    ...shorthands.borderRadius(tokens.borderRadiusCircular),
    color: tokens.colorNeutralBackground1,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    width: '180px',
    paddingLeft: '4px',
    paddingRight: '4px',
    ...shorthands.overflow('hidden'),
  },
});

interface FunctionListItemProps {
  functionData: FunctionData;
}

const FunctionListItem = ({ functionData }: FunctionListItemProps) => {
  const cardStyles = useCardStyles();
  const fnBranding = getFunctionBrandingForCategory(functionData.category);

  return (
    <Button key={functionData.key} alt-text={functionData.displayName} className={cardStyles.button}>
      <div className={cardStyles.iconContainer} style={{ backgroundColor: customTokens[fnBranding.colorTokenName] }}>
        <FunctionIcon
          functionKey={functionData.key}
          functionName={functionData.functionName}
          categoryName={functionData.category}
          color={tokens.colorNeutralForegroundInverted}
        />
      </div>

      <Caption1 truncate block className={cardStyles.text}>
        {functionData.displayName}
      </Caption1>

      <span style={{ marginLeft: 'auto' }}>
        <DMTooltip text={functionData.description} />
      </span>
    </Button>
  );
};

export default FunctionListItem;
