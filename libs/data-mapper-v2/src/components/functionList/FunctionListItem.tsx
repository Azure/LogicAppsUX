import { customTokens } from '../../core';
import type { FunctionData } from '../../models/Function';
import { getFunctionBrandingForCategory } from '../../utils/Function.Utils';
import { FunctionIcon } from '../functionIcon/FunctionIcon';
//import { DMTooltip } from '../tooltip/tooltip';
import { Button, Caption1, TreeItem, TreeItemLayout, makeStyles, shorthands, tokens } from '@fluentui/react-components';
import { useStyles } from './styles';

const fnIconSize = '12px';

const useCardStyles = makeStyles({
  button: {
    height: '30px',
    width: '100%',
    display: 'flex',
    backgroundColor: '#E8F3FE',
    ...shorthands.border('0px'),
    ...shorthands.padding('1px 4px 1px 4px'),
    ':hover': {
      backgroundColor: '#E8F3FE',
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
    width: '210px',
    paddingLeft: '4px',
    paddingRight: '4px',
    fontSize: '13px',
    color: '#242424',
    ...shorthands.overflow('hidden'),
  },
  treeItem: {
    ':hover': {
      backgroundColor: '#E8F3FE',
    },
  },
});

interface FunctionListItemProps {
  functionData: FunctionData;
}

const FunctionListItem = ({ functionData }: FunctionListItemProps) => {
  const cardStyles = useCardStyles();
  const styles = useStyles();
  const fnBranding = getFunctionBrandingForCategory(functionData.category);

  return (
    <TreeItem className={styles.functionTreeItem} itemType="leaf">
      <TreeItemLayout className={styles.functionTreeItem}>
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

          <span style={{ marginLeft: 'auto' }} />
        </Button>
      </TreeItemLayout>
    </TreeItem>
  );
};

export default FunctionListItem;
