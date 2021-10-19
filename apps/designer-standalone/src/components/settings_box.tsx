import { useBoolean } from '@fluentui/react-hooks';
import { css } from '@fluentui/utilities';
import { useState } from 'react';
import { Login } from '../app/Login/login';
import styles from './settings_box.module.less';

export const SettingsBox = (props: {
  setResourceId: (res: string) => void;
  setToken: (res: string) => void;
  token?: string | null;
  resourceId?: string | null;
}) => {
  const [active, toggleActive] = useBoolean(false);
  const cs = css(styles.toybox, active && styles.active);
  return (
    <div className={cs}>
      <div role="button" className={styles.nub} onClick={toggleActive.toggle}>
        <span role="img" aria-label="Toolbox">
          🧰
        </span>
      </div>
      <div className={styles.contentWrapper}>
        <h4>Workflow Load Settings</h4>
        <div className={styles.content}>
          <Login setResourceId={props.setResourceId} setToken={props.setToken} resourceId={props.resourceId} token={props.token}></Login>
        </div>
      </div>
    </div>
  );
};
