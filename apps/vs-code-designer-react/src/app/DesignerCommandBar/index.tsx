import { VSCodeContext } from '../../webviewCommunication';
import type { ICommandBarItemProps } from '@fluentui/react';
import { CommandBar } from '@fluentui/react';
import { serializeWorkflow as serializeBJSWorkflow, store as DesignerStore } from '@microsoft/logic-apps-designer';
import { ExtensionCommand } from '@microsoft/vscode-extension';
import { useContext } from 'react';
import { useIntl } from 'react-intl';

export const DesignerCommandBar: React.FC = () => {
  const intl = useIntl();
  const vscode = useContext(VSCodeContext);

  const onSave = async () => {
    const designerState = DesignerStore.getState();
    const { definition, parameters, connectionReferences } = await serializeBJSWorkflow(designerState, {
      skipValidation: true,
      ignoreNonCriticalErrors: true,
    });
    vscode.postMessage({
      command: ExtensionCommand.save,
      definition,
      parameters,
      connectionReferences,
    });
  };

  const Resources = {
    DESIGNER_SAVE: intl.formatMessage({
      defaultMessage: 'Save',
      description: 'Button text for save',
    }),
    DESIGNER_PARAMETERS: intl.formatMessage({
      defaultMessage: 'Parameters',
      description: 'Button text for parameters',
    }),
  };

  const items: ICommandBarItemProps[] = [
    {
      ariaLabel: Resources.DESIGNER_SAVE,
      iconProps: { iconName: 'Save' },
      key: 'Save',
      name: Resources.DESIGNER_SAVE,
      onClick: () => {
        onSave();
      },
    },
    {
      ariaLabel: Resources.DESIGNER_PARAMETERS,
      iconProps: { iconName: 'Parameter' },
      key: 'Parameter',
      name: Resources.DESIGNER_PARAMETERS,
      onClick: () => {
        return true;
      },
    },
  ];

  return <CommandBar items={items} />;
};
