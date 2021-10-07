import { Callout, ICalloutProps } from '@fluentui/react/lib/Callout';
import { List } from '@fluentui/react/lib/List';
import * as React from 'react';

import { DisableableModule, Module } from './models';

export interface ModulesProps {
  disabled?: boolean;
  moduleCalloutProps?: ICalloutProps;
  modules: Module[];
  visible: boolean;
  onRenderModule?(item: Module): JSX.Element;
}

export const Modules: React.FC<ModulesProps> = (props) => {
  const { visible, disabled = false, moduleCalloutProps, modules, onRenderModule } = props;
  if (!visible) {
    return null;
  }

  const moduleCallout = moduleCalloutProps ? <Callout {...moduleCalloutProps} /> : null;

  const items: DisableableModule[] = modules.map((module) => ({ ...module, disabled }));

  // NOTE(psamband): Accessibility issue in List - https://github.com/OfficeDev/@fluentui/react/issues/8206
  const modulesList = items.length > 0 ? <List items={items} onRenderCell={onRenderModule as any} /> : null;
  return (
    <div className="msla-modules">
      {modulesList}
      {moduleCallout}
    </div>
  );
};
