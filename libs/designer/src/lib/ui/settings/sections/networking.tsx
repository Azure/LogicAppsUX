import type { SectionProps } from '..';
import { useBoolean } from '@fluentui/react-hooks';
import type { Settings, SettingSectionProps } from '@microsoft/designer-ui';
import { SettingsSection, SettingLabel } from '@microsoft/designer-ui';
import { useState } from 'react';
import { useIntl } from 'react-intl';

export const Networking = ({
  readOnly,
  // retryPolicy,
  suppressWorkflowHeaders,
  suppressWorkflowHeadersOnResponse,
  paging,
  // uploadChunk,
  // downloadChunkSize,
  asynchronous,
  disableAsyncPattern,
  requestOptions,
}: SectionProps): JSX.Element => {
  const [disableAsyncPatternFromState, toggleDisableAsyncPattern] = useBoolean(!!disableAsyncPattern?.value);
  const [asyncResponseFromState, toggleAsyncResponse] = useBoolean(!!asynchronous?.value);
  // const [downloadChunkFromState, setDownloadChunk] = useState(downloadChunkSize);
  const [pagingFromState, setPaging] = useState(paging?.value ?? { enabled: false, value: undefined });
  // const [retryPolicyFromState, setRetryPolicy] = useState(retryPolicy);
  const [requestOptionsFromState, setRequestOptions] = useState(requestOptions?.value ?? { timeout: '' });
  const [suppressWorkflowHeadersFromState, toggleSuppressWorkflowHeaders] = useBoolean(!!suppressWorkflowHeaders?.value);
  // const [uploadChunkFromState, setUploadChunk] = useState(uploadChunk);
  const [workflowHeadersOnResponseFromState, toggleWorkflowHeadersOnResponse] = useBoolean(!!suppressWorkflowHeadersOnResponse?.value);

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

  const getAsyncPatternSetting = (): Settings => {
    const onAsyncPatternToggle = (_checked: boolean): void => {
      toggleDisableAsyncPattern.toggle();
      // TODO (14427339): Setting Validation
      // TODO (14427277): Write to Store
    };
    const asyncPatternCustomLabel = (
      <SettingLabel labelText={asyncPatternTitle} infoTooltipText={asyncPatternTooltipText} isChild={false} />
    );
    return {
      settingType: 'SettingToggle',
      settingProp: {
        readOnly,
        checked: !disableAsyncPatternFromState,
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
    const onAsyncResponseToggle = (_checked: boolean): void => {
      toggleAsyncResponse.toggle();
      // TODO (14427339): Setting Validation
      // TODO (14427277): Write to Store
    };
    const asyncResponseCustomLabel = (
      <SettingLabel labelText={asyncResponseTitle} infoTooltipText={asyncResponseTooltipText} isChild={false} />
    );

    return {
      settingType: 'SettingToggle',
      settingProp: {
        readOnly,
        checked: asyncResponseFromState,
        onToggleInputChange: (_, checked) => onAsyncResponseToggle(!!checked),
        customLabel: () => asyncResponseCustomLabel,
        onText,
        offText,
      },
      visible: asynchronous?.isSupported,
    };
  };

  const getRequestOptionSetting = (): Settings => {
    const onRequestOptionsChange = (newVal: string): void => {
      setRequestOptions({ timeout: newVal });
      // TODO (14427339): Setting Validation
      // TODO (14427277): Write to Store
    };

    const requestOptionsCustomLabel = (
      <SettingLabel labelText={requestOptionsTitle} infoTooltipText={requestOptionsTooltipText} isChild={false} />
    );

    return {
      settingType: 'SettingTextField',
      settingProp: {
        readOnly,
        value: requestOptionsFromState?.timeout ?? '',
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

    const onSuppressHeadersToggle = (): void => {
      toggleSuppressWorkflowHeaders.toggle();
      // TODO (14427339): Setting Validation
      // TODO (14427277): Write to Store
    };

    return {
      settingType: 'SettingToggle',
      settingProp: {
        readOnly,
        checked: suppressWorkflowHeadersFromState,
        customLabel: () => suppressWorkflowHeadersCustomlabel,
        onText,
        offText,
        onToggleInputChange: () => onSuppressHeadersToggle(),
      },
      visible: suppressWorkflowHeaders?.isSupported,
    };
  };

  const getPaginationSetting = (): Settings => {
    const pagingCustomLabel = <SettingLabel labelText={paginationTitle} infoTooltipText={paginationTooltipText} isChild={false} />;
    const onPaginationValueChange = (newVal: string): void => {
      setPaging({ enabled: !!pagingFromState?.enabled, value: Number(newVal) });
      // TODO (14427339): Setting Validation
      // TODO (14427277): Write to Store
    };
    return {
      settingType: 'ReactiveToggle',
      settingProp: {
        readOnly,
        textFieldLabel: threshold,
        textFieldValue: pagingFromState?.value?.toString() ?? '',
        checked: pagingFromState?.enabled,
        onToggleLabel: onText,
        offToggleLabel: offText,
        onValueChange: (_, newVal) => onPaginationValueChange(newVal as string),
        customLabel: () => pagingCustomLabel,
      },
      visible: paging?.isSupported,
    };
  };

  const getWorkflowHeadersOnResponseSetting = (): Settings => {
    const handleHeadersOnResponseToggle = (): void => {
      toggleWorkflowHeadersOnResponse.toggle();
    };

    const workflowHeadersOnResponseCustomLabel = (
      <SettingLabel labelText={workflowHeadersOnResponseTitle} infoTooltipText={workflowHeadersOnResponseTooltipText} isChild={false} />
    );
    return {
      settingType: 'SettingToggle',
      settingProp: {
        readOnly,
        checked: workflowHeadersOnResponseFromState,
        customLabel: () => workflowHeadersOnResponseCustomLabel,
        onText,
        offText,
        onToggleInputChange: () => handleHeadersOnResponseToggle(),
      },
      visible: suppressWorkflowHeadersOnResponse?.isSupported,
    };
  };

  const networkingSectionProps: SettingSectionProps = {
    id: 'networking',
    title: networking,
    expanded: false,
    settings: [
      getAsyncPatternSetting(),
      getAsyncResponseSetting(),
      // getDownloadChunkSettind(),
      // getUploadChunkSetting(),
      getPaginationSetting(),
      // getRetryPolicySetting(),
      getRequestOptionSetting(),
      getSuppressHeadersSetting(),
      getWorkflowHeadersOnResponseSetting(),
    ],
  };

  return <SettingsSection {...networkingSectionProps} />;
};
