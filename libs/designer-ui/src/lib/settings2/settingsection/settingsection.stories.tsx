// import React from 'react';
import { ComponentMeta, ComponentStory } from '@storybook/react';
import { SettingSectionComponentProps } from '.';
import { SettingsSection, renderSetting, Resources, Categories } from '../';

const categoryNames: Record<string, string> = {
  [Categories.General]: Resources.SETTING_CATEGORY_GENERAL_TITLE,
  [Categories.RunAfter]: Resources.SETTING_CATEGORY_RUN_AFTER_TITLE,
  [Categories.Networking]: Resources.SETTING_CATEGORY_NETWORKING_TITLE,
  [Categories.DataHandling]: Resources.SETTING_CATEGORY_DATA_HANDLING_TITLE,
  [Categories.Security]: Resources.SETTING_CATEGORY_SECURITY_TITLE,
  [Categories.Tracking]: Resources.SETTING_CATEGORY_TRACKING_TITLE,
};

export default {
  component: SettingsSection,
  title: 'Components/Setting Section',
} as ComponentMeta<typeof SettingsSection>;
const Template: ComponentStory<typeof SettingsSection> = (args: SettingSectionComponentProps) => <SettingsSection {...args} />;

export const General = Template.bind({});
General.args = {
  id: Categories.General,
  title: categoryNames[Categories.General],
  expanded: false,
  renderContent: renderSetting,
  onClick: (id) => onToggleActionExpand(id),
};

export const RunAfter = Template.bind({});
RunAfter.args = {
  id: Categories.RunAfter,
  title: categoryNames[Categories.RunAfter],
  expanded: false,
  renderContent: renderSetting,
  onClick: (id) => onToggleActionExpand(id),
};

export const Networking = Template.bind({});
Networking.args = {
  id: Categories.Networking,
  title: categoryNames[Categories.Networking],
  expanded: false,
  renderContent: renderSetting,
  onClick: () => alert('Section Clicked!'),
};

export const DataHandling = Template.bind({});
DataHandling.args = {
  id: Categories.DataHandling,
  title: categoryNames[Categories.DataHandling],
  expanded: false,
  renderContent: renderSetting,
  onClick: () => alert('Section Clicked!'),
};

export const Security = Template.bind({});
Security.args = {
  id: Categories.Security,
  title: categoryNames[Categories.Security],
  expanded: false,
  renderContent: renderSetting,
  onClick: () => alert('Section Clicked!'),
};

export const Tracking = Template.bind({});
Tracking.args = {
  id: Categories.Tracking,
  title: categoryNames[Categories.Tracking],
  expanded: false,
  renderContent: renderSetting,
  onClick: (id) => onToggleActionExpand(id),
};

const onToggleActionExpand = (sectionId: string): void => {
  switch (sectionId) {
    case Categories.General:
      General.args = { ...General.args, expanded: !General.args?.expanded };
      break;
    case Categories.RunAfter:
      RunAfter.args = { ...RunAfter.args, expanded: !RunAfter.args?.expanded };
      break;
    case Categories.Networking:
      Networking.args = { ...Networking.args, expanded: !Networking.args?.expanded };
      break;
    case Categories.DataHandling:
      DataHandling.args = { ...DataHandling.args, expanded: !DataHandling.args?.expanded };
      break;
    case Categories.Security:
      Security.args = { ...Security.args, expanded: !Security.args?.expanded };
      break;
    case Categories.Tracking:
      Tracking.args = { ...Tracking.args, expanded: !Tracking.args?.expanded };
      break;
  }
};
