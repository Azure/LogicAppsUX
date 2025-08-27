import { makeStyles, tokens } from '@fluentui/react-components';

export const useCompactConnectorCardStyles = makeStyles({
  card: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    cursor: 'pointer',
    backgroundColor: tokens.colorNeutralBackground1,
    transition: 'all 0.1s ease',
    marginBottom: '8px',
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
      border: `1px solid ${tokens.colorNeutralStroke1Hover}`,
    },
  },
  iconContainer: {
    marginRight: '12px',
    flexShrink: 0,
  },
  icon: {
    width: '24px',
    height: '24px',
    borderRadius: tokens.borderRadiusSmall,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '2px',
  },
  title: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  builtInBadge: {
    marginLeft: '8px',
    padding: '2px 6px',
    backgroundColor: tokens.colorBrandBackground2,
    borderRadius: '10px',
    fontSize: '10px',
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorBrandForeground2,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  description: {
    color: tokens.colorNeutralForeground2,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    display: 'block',
  },
  chevron: {
    marginLeft: '8px',
    flexShrink: 0,
    color: tokens.colorNeutralForeground2,
  },
});
