import { makeStyles } from '@fluentui/react-components';
import { BranchForkFilled, BranchForkRegular } from '@fluentui/react-icons';
const useStyles = makeStyles({ rotated: { transform: 'rotate(90deg)' } });
export function IfIconRegular() {
  const styles = useStyles();
  return <BranchForkRegular className={styles.rotated} />;
}
export function IfIconFilled() {
  const styles = useStyles();
  return <BranchForkFilled className={styles.rotated} />;
}
