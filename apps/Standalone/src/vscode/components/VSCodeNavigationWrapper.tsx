import { Link, useLocation } from 'react-router-dom';
import { makeStyles, Title3 } from '@fluentui/react-components';

const useStyles = makeStyles({
  nav: {
    display: 'flex',
    gap: '16px',
    padding: '8px 16px',
    backgroundColor: '#f3f2f1',
    borderBottom: '1px solid #edebe9',
    alignItems: 'center',
  },
  navLink: {
    textDecoration: 'none',
    padding: '8px 12px',
    borderRadius: '4px',
    color: '#323130',
    transition: 'background-color 0.1s ease',
    '&:hover': {
      backgroundColor: '#edebe9',
    },
  },
  activeLink: {
    backgroundColor: '#0078d4',
    color: 'white',
    '&:hover': {
      backgroundColor: '#106ebe',
    },
  },
});

export const VSCodeNavigationWrapper = () => {
  const styles = useStyles();
  const location = useLocation();

  const isActiveLink = (path: string) => {
    return location.pathname.startsWith(`/vscode${path}`);
  };

  return (
    <div className={styles.nav}>
      <Title3>VS Code Components</Title3>
      <Link to="/vscode/export" className={`${styles.navLink} ${isActiveLink('/export') ? styles.activeLink : ''}`}>
        Export
      </Link>
      <Link to="/vscode/overview" className={`${styles.navLink} ${isActiveLink('/overview') ? styles.activeLink : ''}`}>
        Overview
      </Link>
    </div>
  );
};
