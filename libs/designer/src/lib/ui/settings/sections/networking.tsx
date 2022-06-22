import type { SectionProps, TextChangeHandler, ToggleHandler } from '..';
import type { Settings, SettingSectionProps } from '../settingsection';
import { SettingsSection, SettingLabel } from '../settingsection';
import { useIntl } from 'react-intl';

export interface NetworkingSectionProps extends SectionProps {
  onAsyncPatternToggle: ToggleHandler;
  onAsyncResponseToggle: ToggleHandler;
  onRequestOptionsChange: TextChangeHandler;
  onSuppressHeadersToggle: ToggleHandler;
  onPaginationValueChange: TextChangeHandler;
  onHeadersOnResponseToggle: ToggleHandler;
  onContentTransferToggle: () => void;
  chunkedTransferMode: boolean;
}

export const Networking = ({
  readOnly,
  suppressWorkflowHeaders,
  suppressWorkflowHeadersOnResponse,
  paging,
  uploadChunk,
  downloadChunkSize,
  asynchronous,
  disableAsyncPattern,
  requestOptions,
  onAsyncPatternToggle,
  onAsyncResponseToggle,
  onRequestOptionsChange,
  onSuppressHeadersToggle,
  onPaginationValueChange,
  onHeadersOnResponseToggle,
  onContentTransferToggle,
  chunkedTransferMode,
}: NetworkingSectionProps): JSX.Element => {
  const intl = useIntl();
  const onText = intl.formatMessage({
    defaultMessage: 'On',
    description: 'label when setting is on',
  });
  const offText = intl.formatMessage({
    defaultMessage: 'Off',
    description: 'label when setting is off',
  });
  const asyncPatternTitle = intl.formatMessage({
    defaultMessage: 'Asynchronous Pattern',
    description: 'title for async pattern setting',
  });
  const asyncPatternTooltipText = intl.formatMessage({
    defaultMessage:
      "With the asynchronous pattern, if the remote server indicates that the request is accepted for processing with a 202 (Accepted) response, the Logic Apps engine will keep polling the URL specified in the response's location header until reaching a terminal state.",
    description: 'description of asynchronous pattern setting',
  });
  const asyncResponseTitle = intl.formatMessage({
    defaultMessage: 'Asynchronous Response',
    description: 'title for asynchronous response setting',
  });
  const asyncResponseTooltipText = intl.formatMessage({
    defaultMessage:
      'Asynchronous response allows a Logic App to respond with a 202 (Accepted) to indicate the request has been accepted for processing. A location header will be provided to retrieve the final state.',
    description: 'description of asynchronous response setting',
  });
  const requestOptionsTitle = intl.formatMessage({
    defaultMessage: 'Request Options',
    description: 'title for request options setting',
  });
  const requestOptionsTooltipText = intl.formatMessage({
    defaultMessage:
      "The maximum duration on a single outbound request from this action. If the request doesn't finish within this limit after running retries, the action fails.",
    description: 'description of request options duration setting',
  });
  const duration = intl.formatMessage({
    defaultMessage: 'Duration',
    description: 'label for request options input',
  });
  const suppressWorkflowHeadersTitle = intl.formatMessage({
    defaultMessage: 'Suppress workflow headers',
    description: 'title for suppress workflow headers setting',
  });
  const suppressWorkflowHeadersTooltipText = intl.formatMessage({
    defaultMessage: 'Limit Logic Apps to not include workflow metadata headers in the outgoing request.',
    description: 'description of suppress woers setting',
  });
  const paginationTitle = intl.formatMessage({
    defaultMessage: 'Pagination',
    description: 'title for pagination setting',
  });
  const paginationTooltipText = intl.formatMessage({
    defaultMessage:
      "Retrieve items to meet the specified threshold by following the continuation token. Due to connector's page size, the number returned may exceed the threshold.",
    description: 'description for pagination setting',
  });
  const threshold = intl.formatMessage({
    defaultMessage: 'Threshold',
    description: 'title for pagination user input',
  });
  const workflowHeadersOnResponseTitle = intl.formatMessage({
    defaultMessage: 'Suppress workflow headers on response',
    description: 'title for workflow headers on response setting',
  });
  const workflowHeadersOnResponseTooltipText = intl.formatMessage({
    defaultMessage: 'Limit Logic Apps to not include workflow metadata headers in the response.',
    description: 'description of workflow headers on response setting',
  });
  const networking = intl.formatMessage({
    defaultMessage: 'Networking',
    description: 'title for networking setting section',
  });
  const contentTransferTitle = intl.formatMessage({
    defaultMessage: 'Content Transfer',
    description: 'title for content transfer setting',
  });
  const contentTransferDescription = intl.formatMessage({
    defaultMessage:
      'Specify the behavior and capabilities for transferring content over HTTP. Large messages may be split up into smaller requests to the connector to allow large message upload. Details can be found at http://aka.ms/logicapps-chunk#upload-content-in-chunks',
    description: 'description of content transfer setting',
  });

  const getAsyncPatternSetting = (): Settings => {
    const asyncPatternCustomLabel = (
      <SettingLabel labelText={asyncPatternTitle} infoTooltipText={asyncPatternTooltipText} isChild={false} />
    );
    return {
      settingType: 'SettingToggle',
      settingProp: {
        readOnly,
        checked: !disableAsyncPattern?.value,
        onToggleInputChange: (_, checked) => onAsyncPatternToggle(!!checked),
        customLabel: () => asyncPatternCustomLabel,
        inlineLabel: true,
        onText,
        offText,
      },
      visible: disableAsyncPattern?.isSupported,
    };
  };

  const getAsyncResponseSetting = (): Settings => {
    const asyncResponseCustomLabel = (
      <SettingLabel labelText={asyncResponseTitle} infoTooltipText={asyncResponseTooltipText} isChild={false} />
    );

    return {
      settingType: 'SettingToggle',
      settingProp: {
        readOnly,
        checked: asynchronous?.value,
        onToggleInputChange: (_, checked) => onAsyncResponseToggle(!!checked),
        customLabel: () => asyncResponseCustomLabel,
        onText,
        offText,
      },
      visible: asynchronous?.isSupported,
    };
  };

  const getRequestOptionSetting = (): Settings => {
    const requestOptionsCustomLabel = (
      <SettingLabel labelText={requestOptionsTitle} infoTooltipText={requestOptionsTooltipText} isChild={false} />
    );

    return {
      settingType: 'SettingTextField',
      settingProp: {
        readOnly,
        value: requestOptions?.value?.timeout ?? '',
        label: duration,
        placeholder: 'Example: PT1S',
        customLabel: () => requestOptionsCustomLabel,
        onValueChange: (_, newVal) => onRequestOptionsChange(newVal as string),
      },
      visible: requestOptions?.isSupported,
    };
  };

  const getSuppressHeadersSetting = (): Settings => {
    const suppressWorkflowHeadersCustomlabel = (
      <SettingLabel labelText={suppressWorkflowHeadersTitle} infoTooltipText={suppressWorkflowHeadersTooltipText} isChild={false} />
    );

    return {
      settingType: 'SettingToggle',
      settingProp: {
        readOnly,
        checked: suppressWorkflowHeaders?.value,
        customLabel: () => suppressWorkflowHeadersCustomlabel,
        onText,
        offText,
        onToggleInputChange: (_, checked) => onSuppressHeadersToggle(!!checked),
      },
      visible: suppressWorkflowHeaders?.isSupported,
    };
  };

  const getPaginationSetting = (): Settings => {
    const pagingCustomLabel = <SettingLabel labelText={paginationTitle} infoTooltipText={paginationTooltipText} isChild={false} />;
    return {
      settingType: 'ReactiveToggle',
      settingProp: {
        readOnly,
        textFieldLabel: threshold,
        textFieldValue: paging?.value?.toString() ?? '',
        checked: paging?.value?.enabled,
        onToggleLabel: onText,
        offToggleLabel: offText,
        onValueChange: (_, newVal) => onPaginationValueChange(newVal as string),
        customLabel: () => pagingCustomLabel,
      },
      visible: paging?.isSupported,
    };
  };

  const getWorkflowHeadersOnResponseSetting = (): Settings => {
    const workflowHeadersOnResponseCustomLabel = (
      <SettingLabel labelText={workflowHeadersOnResponseTitle} infoTooltipText={workflowHeadersOnResponseTooltipText} isChild={false} />
    );
    return {
      settingType: 'SettingToggle',
      settingProp: {
        readOnly,
        checked: suppressWorkflowHeadersOnResponse?.value,
        customLabel: () => workflowHeadersOnResponseCustomLabel,
        onText,
        offText,
        onToggleInputChange: (_, checked) => onHeadersOnResponseToggle(!!checked),
      },
      visible: suppressWorkflowHeadersOnResponse?.isSupported,
    };
  };

  const getContentTransferSetting = (): Settings => {
    const contentTransferLabel = (
      <SettingLabel labelText={contentTransferTitle} infoTooltipText={contentTransferDescription} isChild={false} />
    );

    return {
      settingType: 'SettingToggle',
      settingProp: {
        checked: chunkedTransferMode,
        readOnly,
        onText,
        offText,
        onToggleInputChange: () => onContentTransferToggle(),
        customLabel: () => contentTransferLabel,
      },
      visible: uploadChunk?.isSupported || downloadChunkSize?.isSupported,
    };
  };

  const networkingSectionProps: SettingSectionProps = {
    id: 'networking',
    title: networking,
    expanded: false,
    settings: [
      getAsyncPatternSetting(),
      getAsyncResponseSetting(),
      getContentTransferSetting(),
      getPaginationSetting(),
      getRequestOptionSetting(),
      getSuppressHeadersSetting(),
      getWorkflowHeadersOnResponseSetting(),
    ],
  };

  return <SettingsSection {...networkingSectionProps} />;
};
