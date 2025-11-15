import { makeStyles, tokens, Button } from '@fluentui/react-components';
import { Alert24Regular, ChatHelp24Regular } from '@fluentui/react-icons';
import { ThemeSwitcher } from './ThemeSwitcher';
import { UserProfileMenu } from './UserProfileMenu';

const useStyles = makeStyles({
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '48px',
    paddingLeft: '20px',
    paddingRight: '20px',
    backgroundColor: tokens.colorNeutralBackground1,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    boxShadow: tokens.shadow2,
  },
  left: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  logoIcon: {
    width: '24px',
    height: '24px',
    background: `linear-gradient(135deg, ${tokens.colorBrandBackground}, ${tokens.colorBrandBackground2})`,
    borderRadius: '4px',
  },
  title: {
    fontSize: tokens.fontSizeBase400,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
    margin: 0,
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  iconButton: {
    minWidth: 'auto',
    padding: '8px',
  },
  docsLink: {
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
    textDecoration: 'none',
    padding: '6px 12px',
    borderRadius: tokens.borderRadiusMedium,
    transition: 'background-color 0.2s',
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
});

export const Header = () => {
  const styles = useStyles();

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <div className={styles.logo}>
          <div className={styles.logoIcon} />
          <h1 className={styles.title}>OTTO</h1>
        </div>
      </div>

      <div className={styles.right}>
        <a href="https://docs.microsoft.com" className={styles.docsLink} target="_blank" rel="noopener noreferrer">
          Docs
        </a>

        <Button appearance="subtle" icon={<Alert24Regular />} className={styles.iconButton} aria-label="Notifications" />

        <Button appearance="subtle" icon={<ChatHelp24Regular />} className={styles.iconButton} aria-label="Help" />

        <ThemeSwitcher />

        <UserProfileMenu />
      </div>
    </header>
  );
};
