import { makeStyles, tokens } from '@fluentui/react-components';

export const useBuiltinToolsStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    padding: tokens.spacingVerticalM,
    gap: tokens.spacingVerticalS,
  },
  header: {
    fontWeight: tokens.fontWeightSemibold,
    fontSize: tokens.fontSizeBase300,
    color: tokens.colorNeutralForeground1,
  },
  toolRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalM,
  },
  toolInfo: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    gap: tokens.spacingVerticalXXS,
  },
  toolName: {
    fontWeight: tokens.fontWeightSemibold,
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground1,
  },
  toolDescription: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground2,
  },
});
