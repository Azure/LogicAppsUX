import { Login } from '../app/Login/login';
import ContextSettings from './contextSettings';
import styles from './settings_box.module.less';
import { useBoolean } from '@fluentui/react-hooks';
import { css } from '@fluentui/utilities';

export const SettingsBox = () => {
  const [active, toggleActive] = useBoolean(false);
  const cs = css(styles.toybox, active && styles.active);

  const SettingsSection = (props: any) => {
    const { title, content } = props;
    const [expanded, toggleExpanded] = useBoolean(true);
    return (
      <>
        <h4 onClick={toggleExpanded.toggle}>
          <span className={css(expanded && styles.openIcon)}>▼</span> {title}
        </h4>
        {expanded ? <div className={styles.content}>{content}</div> : null}
      </>
    );
  };

  return (
    <div className={cs}>
      <div role="button" className={styles.nub} onClick={toggleActive.toggle}>
        <span role="img" aria-label="Toolbox">
          🧰
        </span>
      </div>
      <div className={styles.contentWrapper}>
        <SettingsSection title="Workflow Load Settings" content={<Login />} />
        <SettingsSection title="Context Settings" content={<ContextSettings />} />
      </div>
    </div>
  );
};
