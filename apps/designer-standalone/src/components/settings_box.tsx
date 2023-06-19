import { AzureConsumptionLogicAppSelector } from '../app/AzureLogicAppsDesigner/LogicAppSelectionSetting/AzureConsumptionLogicAppSelector';
import { AzureStandardLogicAppSelector } from '../app/AzureLogicAppsDesigner/LogicAppSelectionSetting/AzureStandardLogicAppSelector';
import { LocalLogicAppSelector } from '../app/LocalDesigner/LogicAppSelector/LogicAppSelector';
import ContextSettings from '../app/SettingsSections/contextSettings';
import SourceSettings from '../app/SettingsSections/sourceSettings';
import { useIsConsumption, useIsDarkMode, useIsLocal } from '../state/workflowLoadingSelectors';
import { LocalizationSettings } from './LocalizationSettings';
import styles from './settings_box.module.less';
import { darkTheme } from './themes';
import { ThemeProvider } from '@fluentui/react';
import { useBoolean } from '@fluentui/react-hooks';
import { css } from '@fluentui/utilities';

export const SettingsBox = () => {
  const [active, toggleActive] = useBoolean(true);
  const isDark = useIsDarkMode();
  const isLocal = useIsLocal();
  const isConsumption = useIsConsumption();
  const cs = css(styles.toybox, active && styles.active, isDark && styles.dark);

  const SettingsSection = (props: any) => {
    const { title, children, startExpanded = true } = props;
    const [expanded, toggleExpanded] = useBoolean(startExpanded);
    return (
      <>
        <h4 onClick={toggleExpanded.toggle}>
          <span className={css(expanded && styles.openIcon)}>▼</span> {title}
        </h4>
        {expanded ? <div className={styles.content}>{children}</div> : null}
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
          <SettingsSection title="Logic App Source">
            <SourceSettings />
          </SettingsSection>
          <SettingsSection title="Workflow Load Settings">
            {isLocal ? <LocalLogicAppSelector /> : isConsumption ? <AzureConsumptionLogicAppSelector /> : <AzureStandardLogicAppSelector />}
          </SettingsSection>
          <SettingsSection title="Context Settings" startExpanded={false}>
            <ContextSettings />
          </SettingsSection>
          <SettingsSection title="Locale" startExpanded={false}>
            <LocalizationSettings />
          </SettingsSection>
        </div>
      </div>
    </ThemeProvider>
  );
};
