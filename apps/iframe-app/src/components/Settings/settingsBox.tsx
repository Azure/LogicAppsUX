// import { AzureConsumptionLogicAppSelector } from '../app/AzureLogicAppsDesigner/LogicAppSelectionSetting/AzureConsumptionLogicAppSelector';
// import { AzureStandardLogicAppSelector } from '../app/AzureLogicAppsDesigner/LogicAppSelectionSetting/AzureStandardLogicAppSelector';
// import SourceSettings from '../app/SettingsSections/sourceSettings';
import styles from './settingBox.module.less';
import { darkTheme } from '../themes';
import { ThemeProvider } from '@fluentui/react';
import { useBoolean } from '@fluentui/react-hooks';
import { css } from '@fluentui/utilities';
import { useState } from 'react';

export const SettingsBox = () => {
  const [active, toggleActive] = useBoolean(true);
  const isDark = true;
  const cs = css(styles.toybox, active && styles.active, isDark && styles.dark);
  const [left, setLeft] = useState<string | number | undefined>(undefined);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const nub = e.currentTarget;
    const startX = e.clientX;
    const startLeft = nub.offsetLeft;
    const parent = nub.parentElement;
    const sibling = nub.nextElementSibling as HTMLElement;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      let newLeft = startLeft + delta;

      if (parent) {
        const parentWidth = parent.clientWidth;
        const siblingWidth = sibling ? sibling.clientWidth : 0;
        const maxWidth = Math.max(parentWidth, siblingWidth);
        const nubWidth = nub.offsetWidth;
        const maxLeft = maxWidth - nubWidth;
        newLeft = Math.max(0, Math.min(newLeft, maxLeft));
      }

      setLeft(newLeft);
    };

    const onMouseUp = (upEvent: MouseEvent) => {
      const moved = Math.abs(upEvent.clientX - startX);
      if (moved < 5) {
        toggleActive.toggle();
      }
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

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
        <div role="button" className={styles.nub} onMouseDown={handleMouseDown} style={{ left }}>
          <span role="img" aria-label="Toolbox">
            🧰
          </span>
        </div>
        <div className={styles.contentWrapper}>
          <SettingsSection title="Logic App Source">{/* <SourceSettings /> */}</SettingsSection>
          <SettingsSection title="Workflow Load Settings">{}</SettingsSection>
          <SettingsSection title="Context Settings">{}</SettingsSection>
        </div>
      </div>
    </ThemeProvider>
  );
};
