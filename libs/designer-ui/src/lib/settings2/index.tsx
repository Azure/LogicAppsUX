import { IconButton, Separator } from '@fluentui/react';
import { format } from '@microsoft-logic-apps/utils';
// import { useState } from 'react';
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

export enum Categories {
  General = 'General',
  RunAfter = 'RunAfter',
  Networking = 'Networking',
  DataHandling = 'DataHandling',
  Security = 'Security',
  Tracking = 'Tracking',
}

export function SettingsSection({ id, title, expanded, renderContent, onClick, isInverted }: SettingSectionComponentProps): JSX.Element {
  const iconProp = { iconName: expanded ? 'ChevronDownMed' : 'ChevronRightMed' };
  const chevronStyles = { icon: { color: '#8a8886', fontSize: 12 } };
  const separatorStyles = { root: { color: isInverted ? '#323130' : '#eaeaea' } };
  return (
    <div className="msla-setting-section-content">
      <div className="msla-setting-section-header" onClick={() => onClick(id)}>
        <IconButton
          className="msla-setting-section-header-icon"
          ariaLabel={format(Resources.EXPAND_OR_COLLAPSE, title)}
          iconProps={iconProp}
          styles={chevronStyles}
        />
        <div className="msla-setting-section-header-text">{title}</div>
      </div>
      {expanded ? renderContent(id) : null}
      <Separator className="msla-setting-section-separator" styles={separatorStyles} />
    </div>
  );
}

export function renderSetting(settingKey: string): JSX.Element {
  // const { graphNodeId: nodeId } = this.props;
  // const { enabledSettings, readOnly } = this.state;
  // const settingProps: SettingProps = { nodeId, settings: enabledSettings[settingKey], readOnly };
  // switch (settingKey) {
  //     case Categories.Async:
  //         return <Async {...settingProps} />;
  //     case Categories.Data:
  //         const settingHydratingProps: DataProps = {
  //             ...settingProps,
  //             hydratingProps: this._getHydratingProps('trackedpropertiesdictionary'),
  //             trackEvent: this.trackEvent,
  //         };
  //         return <Data {...settingHydratingProps} />;
  //     case Categories.Headers:
  //         return <WorkflowHeaders {...settingProps} />;
  //     default:
  //         return null;
  // }
  return <div>{`This is the ${settingKey} setting body`}</div>;
}
