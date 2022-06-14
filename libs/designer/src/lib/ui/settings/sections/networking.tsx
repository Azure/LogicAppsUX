import type { SectionProps } from '..';
// import { useDispatch } from "react-redux";
import { useBoolean } from '@fluentui/react-hooks';
import type { Settings, SettingSectionProps } from '@microsoft/designer-ui';
import { SettingsSection, SettingLabel } from '@microsoft/designer-ui';
import { useState } from 'react';

export const Networking = ({
  readOnly,
  // nodeId,
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

  const getAsyncPatternSetting = (): Settings => {
    const onAsyncPatternToggle = (_checked: boolean): void => {
      // validate first and surface error if invalid?
      toggleDisableAsyncPattern.toggle();
      // dispatch to store
    };
    const asyncPatternCustomLabel = (
      <SettingLabel
        labelText="Asynchronous Pattern"
        infoTooltipText="With the asynchronous pattern, if the remote server indicates that the request is accepted for processing with a 202 (Accepted) response, the Logic Apps engine will keep polling the URL specified in the response's location header until reaching a terminal state."
        isChild={false}
      />
    );
    return {
      settingType: 'SettingToggle',
      settingProp: {
        readOnly,
        checked: !disableAsyncPatternFromState,
        onToggleInputChange: (_, checked) => onAsyncPatternToggle(!!checked),
        customLabel: () => asyncPatternCustomLabel,
        inlineLabel: true,
        onText: 'On',
        offText: 'Off',
      },
      visible: disableAsyncPattern?.isSupported,
    };
  };

  const getAsyncResponseSetting = (): Settings => {
    const onAsyncResponseToggle = (_checked: boolean): void => {
      // validate
      toggleAsyncResponse.toggle();
      // write to store
    };
    const asyncResponseCustomLabel = (
      <SettingLabel
        labelText="Asynchronous Response"
        infoTooltipText="Asynchronous response allows a Logic App to respond with a 202 (Accepted) to indicate the request has been accepted for processing. A location header will be provided to retrieve the final state."
        isChild={false}
      />
    );

    return {
      settingType: 'SettingToggle',
      settingProp: {
        readOnly,
        checked: asyncResponseFromState,
        onToggleInputChange: (_, checked) => onAsyncResponseToggle(!!checked),
        customLabel: () => asyncResponseCustomLabel,
        onText: 'On',
        offText: 'Off',
      },
      visible: asynchronous?.isSupported,
    };
  };

  const getRequestOptionSetting = (): Settings => {
    const onRequestOptionsChange = (newVal: string): void => {
      setRequestOptions({ timeout: newVal });
      // validate
      // dispatch to store
    };

    const requestOptionsCustomLabel = (
      <SettingLabel
        labelText="Request Options"
        infoTooltipText="The maximum duration on a single outbound request from this action. If the request doesn't finish within this limit after running retries, the action fails."
        isChild={false}
      />
    );

    return {
      settingType: 'SettingTextField',
      settingProp: {
        readOnly,
        value: requestOptionsFromState?.timeout ?? '',
        label: 'Duration',
        placeholder: 'Example: PT1S',
        customLabel: () => requestOptionsCustomLabel,
        onValueChange: (_, newVal) => onRequestOptionsChange(newVal as string),
      },
      visible: requestOptions?.isSupported, //isRequestOptionsSupported(nodeId)
    };
  };

  const getSuppressHeadersSetting = (): Settings => {
    const suppressWorkflowHeadersCustomlabel = (
      <SettingLabel
        labelText="Suppress workflow headers"
        infoTooltipText="Limit Logic Apps to not include workflow metadata headers in the outgoing request."
        isChild={false}
      />
    );

    const onSuppressHeadersToggle = (): void => {
      toggleSuppressWorkflowHeaders.toggle();
      // validate?
      // dispatch to store.
    };

    return {
      settingType: 'SettingToggle',
      settingProp: {
        readOnly,
        checked: suppressWorkflowHeadersFromState,
        customLabel: () => suppressWorkflowHeadersCustomlabel,
        onText: 'On',
        offText: 'Off',
        onToggleInputChange: () => onSuppressHeadersToggle(),
      },
      visible: suppressWorkflowHeaders?.isSupported, //isSuppressWorkflowSupported(nodeId)
    };
  };

  const getPaginationSetting = (): Settings => {
    const pagingCustomLabel = (
      <SettingLabel
        labelText="Pagination"
        infoTooltipText="Retrieve items to meet the specified threshold by following the continuation token. Due to connector's page size, the number returned may exceed the threshold."
        isChild={false}
      />
    );
    const onPaginationValueChange = (newVal: string): void => {
      setPaging({ enabled: !!pagingFromState?.enabled, value: Number(newVal) });
      // validate
      // write to store
    };
    return {
      settingType: 'ReactiveToggle',
      settingProp: {
        readOnly,
        textFieldLabel: 'Threshold',
        textFieldValue: pagingFromState?.value?.toString() ?? '',
        checked: pagingFromState?.enabled,
        onToggleLabel: 'On',
        offToggleLabel: 'Off',
        onValueChange: (_, newVal) => onPaginationValueChange(newVal as string),
        customLabel: () => pagingCustomLabel,
      },
      visible: paging?.isSupported, //isPaginationSupported(nodeId)
    };
  };

  const getWorkflowHeadersOnResponseSetting = (): Settings => {
    const handleHeadersOnResponseToggle = (): void => {
      toggleWorkflowHeadersOnResponse.toggle();
    };

    const workflowHeadersOnResponseCustomLabel = (
      <SettingLabel
        labelText="Suppress workflow headers on response"
        infoTooltipText="Limit Logic Apps to not include workflow metadata headers in the response."
        isChild={false}
      />
    );
    return {
      settingType: 'SettingToggle',
      settingProp: {
        readOnly,
        checked: workflowHeadersOnResponseFromState,
        customLabel: () => workflowHeadersOnResponseCustomLabel,
        onText: 'On',
        offText: 'Off',
        onToggleInputChange: () => handleHeadersOnResponseToggle(),
      },
      visible: suppressWorkflowHeadersOnResponse?.isSupported, //isSuppressWorklowHeadersOnResponseSupported
    };
  };

  const networkingSectionProps: SettingSectionProps = {
    id: 'networking',
    title: 'Networking',
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
