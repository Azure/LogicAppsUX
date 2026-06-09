import { makeStyles, shorthands, tokens } from '@fluentui/react-components';

export const useMultiSelectDeleteModalStyles = makeStyles({
  tagList: {
    display: 'flex',
    flexWrap: 'wrap',
    ...shorthands.gap('6px'),
    marginTop: '12px',
    maxHeight: '240px',
    overflowY: 'auto',
  },
  tagIcon: {
    width: '20px',
    height: '20px',
    ...shorthands.margin('4px'),
    ...shorthands.borderRadius(tokens.borderRadiusSmall),
  },
});
