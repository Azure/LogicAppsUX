import { Separator } from '@fluentui/azure-themes/node_modules/@fluentui/react';
import { IconButton } from '@fluentui/react';
import { useState } from 'react';
import { SettingSectionComponentProps } from './settingsection';

export const Resources = {
  EXPAND_OR_COLLAPSE: "Expand or collapse '{0}'",
  SETTING_CATEGORY_GENERAL_TITLE: 'General',
  SETTING_CATEGORY_RUN_AFTER_TITLE: 'Run After',
  SETTING_CATEGORY_NETWORKING_TITLE: 'Networking',
  SETTING_CATEGORY_DATA_HANDLING_TITLE: 'Data Handling',
  SETTING_CATEGORY_SECURITY_TITLE: 'Security',
  SETTING_CATEGORY_TRACKING_TITLE: 'Tracking',
};

export function SettingsSection({ title, renderContent, isInverted, textFieldValue }: SettingSectionComponentProps): JSX.Element {
  const [expandedState, setExpanded] = useState(false);
  const iconProp = { iconName: expandedState ? 'ChevronDownMed' : 'ChevronRightMed' };
  const chevronStyles = { icon: { color: '#8a8886', fontSize: 12 } };
  const separatorStyles = { root: { color: isInverted ? '#323130' : '#eaeaea' } };
  const render = (): any => {
    if (expandedState && textFieldValue) {
      return renderContent(textFieldValue);
    } else if (expandedState) {
      return renderContent();
    } else return null;
  };

  return (
    <div className="msla-setting-section-content">
      <div
        className="msla-setting-section-header"
        onClick={() => {
          setExpanded(!expandedState);
        }}
      >
        <IconButton
          className="msla-setting-section-header-icon"
          ariaLabel={`Expand or collapse ${title}`}
          iconProps={iconProp}
          styles={chevronStyles}
        />
        <div className="msla-setting-section-header-text">{title}</div>
      </div>
      {render()}
      <Separator className="msla-setting-section-separator" styles={separatorStyles} />
    </div>
  );
}
