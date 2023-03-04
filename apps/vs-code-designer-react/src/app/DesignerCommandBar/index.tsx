import { VSCodeContext } from '../../webviewCommunication';
import type { ICommandBarItemProps } from '@fluentui/react';
import { CommandBar } from '@fluentui/react';
import { serializeWorkflow as serializeBJSWorkflow, store as DesignerStore } from '@microsoft/logic-apps-designer';
import { ExtensionCommand } from '@microsoft/vscode-extension';
import { useContext } from 'react';
import { useIntl } from 'react-intl';

export interface DesignerCommandBarProps {
  isMonitoringView: boolean;
  isRefreshing: boolean;
  isDisabled: boolean;
  onRefresh(): void;
}

export const DesignerCommandBar: React.FC<DesignerCommandBarProps> = ({ isMonitoringView, isRefreshing, isDisabled, onRefresh }) => {
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

  const onResubmit = async () => {
    vscode.postMessage({
      command: ExtensionCommand.resubmitRun,
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
    MONITORING_VIEW_REFRESH: intl.formatMessage({
      defaultMessage: 'Refresh',
      description: 'Button text for refresh',
    }),
    MONITORING_VIEW_RESUBMIT: intl.formatMessage({
      defaultMessage: 'Resubmit',
      description: 'Button text for resubmit',
    }),
  };

  const desingerItems: ICommandBarItemProps[] = [
    {
      ariaLabel: Resources.DESIGNER_SAVE,
      iconProps: { iconName: 'Save' },
      disabled: isDisabled,
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
      disabled: isDisabled,
      name: Resources.DESIGNER_PARAMETERS,
      onClick: () => {
        return true;
      },
    },
  ];

  const monitoringViewItems: ICommandBarItemProps[] = [
    {
      ariaLabel: Resources.MONITORING_VIEW_REFRESH,
      iconProps: { iconName: 'Refresh' },
      key: 'Refresh',
      disabled: isDisabled ? isDisabled : isRefreshing,
      name: Resources.MONITORING_VIEW_REFRESH,
      onClick: onRefresh,
    },
    {
      ariaLabel: Resources.MONITORING_VIEW_RESUBMIT,
      iconProps: { iconName: 'Rerun' },
      key: 'Rerun',
      disabled: isDisabled,
      name: Resources.MONITORING_VIEW_RESUBMIT,
      onClick: () => {
        onResubmit();
      },
    },
  ];

  return <CommandBar items={isMonitoringView ? monitoringViewItems : desingerItems} />;
};
