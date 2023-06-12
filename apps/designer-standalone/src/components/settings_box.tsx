import { LogicAppSelector } from '../app/AzureLogicAppsDesigner/LogicAppSelectionSetting/LogicAppSelector';
import AzureContextSettings from '../app/AzureLogicAppsDesigner/azureContextSettings';
import { LocalLogicAppSelector } from '../app/LocalDesigner/LogicAppSelector/LogicAppSelector';
import LocalContextSettings from '../app/LocalDesigner/contextSettings';
import type { RootState } from '../state/store';
import { LocalizationSettings } from './LocalizationSettings';
import styles from './settings_box.module.less';
import { darkTheme } from './themes';
import { ThemeProvider } from '@fluentui/react';
import { useBoolean } from '@fluentui/react-hooks';
import { css } from '@fluentui/utilities';
import { useSelector } from 'react-redux';

export const SettingsBox = ({ local }: { local: boolean }) => {
  const [active, toggleActive] = useBoolean(false);
  const isDark = useSelector((state: RootState) => state.workflowLoader.darkMode);
  const useLocalMode = useSelector((state: RootState) => state.workflowLoader.isLocalSelected);
  const cs = css(styles.toybox, active && styles.active, isDark && styles.dark);

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
    <ThemeProvider theme={isDark ? darkTheme : undefined}>
      <div className={cs}>
        <div role="button" className={styles.nub} onClick={toggleActive.toggle}>
          <span role="img" aria-label="Toolbox">
            🧰
          </span>
        </div>
        <div className={styles.contentWrapper}>
          {local ? (
            <>
              <SettingsSection title="Workflow Load Settings" content={<LocalLogicAppSelector />} />
              <SettingsSection title="Context Settings" content={<LocalContextSettings />} />
            </>
          ) : (
            <>
              <SettingsSection title="Workflow Load Settings" content={useLocalMode ? <LocalLogicAppSelector /> : <LogicAppSelector />} />
              <SettingsSection title="Context Settings" content={<AzureContextSettings />} />
            </>
          )}
          <SettingsSection title="Locale" content={<LocalizationSettings />} />
        </div>
      </div>
    </ThemeProvider>
  );
};
