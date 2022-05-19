import { Login } from '../app/Login/login';
import styles from './settings_box.module.less';
import { useBoolean } from '@fluentui/react-hooks';
import { css } from '@fluentui/utilities';

export const SettingsBox = () => {
  const [active, toggleActive] = useBoolean(false);
  const [showLoadSettings, toggleLoadSettings] = useBoolean(true);
  const cs = css(styles.toybox, active && styles.active);
  return (
    <div className={cs}>
      <div role="button" className={styles.nub} onClick={toggleActive.toggle}>
        <span role="img" aria-label="Toolbox">
          🧰
        </span>
      </div>
      <div className={styles.contentWrapper}>
        <h4 onClick={toggleLoadSettings.toggle}>
          <span className={css(showLoadSettings && styles.openIcon)}>▼</span> Workflow Load Settings
        </h4>
        <div className={styles.content}>{showLoadSettings && <Login></Login>}</div>
      </div>
    </div>
  );
};
