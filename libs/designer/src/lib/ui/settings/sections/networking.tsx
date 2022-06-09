import type { SectionProps } from "..";
import { SettingLabel } from "./security";
import type { Settings, SettingSectionProps } from "@microsoft/designer-ui";
import { SettingsSection } from "@microsoft/designer-ui";
import { useState } from "react";
import { useDispatch } from "react-redux";
import { useBoolean } from "@fluentui/react-hooks";

export const Networking = ({
  readOnly,
  nodeId,
  retryPolicy,
  suppressWorkflowHeaders,
  suppressWorkflowHeadersOnResponse,
  paging,
  uploadChunk,
  downloadChunkSize,
  asynchronous,
  disableAsyncPattern,
  requestOptions,
}: SectionProps): JSX.Element => {
  const [asyncPatternFromState, toggleAsyncPattern] = useBoolean(!!disableAsyncPattern);
  const [asyncResponseFromState, toggleAsyncResponse] = useBoolean(!!asynchronous);
  const [downloadChunkFromState, setDownloadChunk] = useState(downloadChunkSize);
  const [pagingFromState, setPaging] = useState(paging);
  const [retryPolicyFromState, setRetryPolicy] = useState(retryPolicy);
  const [requestOptionsFromState, setRequestOptions] = useState(requestOptions);
  const [suppressWorkflowHeadersFromState, toggleSuppressWorkflowHeaders] = useBoolean(!!suppressWorkflowHeaders);
  const [uploadChunkFromState, setUploadChunk] = useState(uploadChunk);
  const [workflowHeadersOnResponseFromState, setWorkflowHeadersOnResponse] = useBoolean(!!suppressWorkflowHeadersOnResponse);


  const getAsyncPatternSetting = (): Settings => {
    const onAsyncPatternToggle = (checked: boolean): void => {
      // validate first and surface error if invalid?
      toggleAsyncPattern.toggle();
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
        visible: true,
        readOnly,
        checked: !asyncPatternFromState,
        onToggleInputChange: (_, checked) => onAsyncPatternToggle(!!checked),
        customLabel: () => asyncPatternCustomLabel,
        label: 'Async Pattern',
        inlineLabel: true
      }
    };
  };

  const getAsyncResponseSetting = (): Settings => {
    const onAsyncResponseToggle = (checked: boolean): void => {
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
        visible: true,
        readOnly,
        checked: asyncResponseFromState,
        onToggleInputChange: (_, checked) => onAsyncResponseToggle(!!checked),
        customLabel: () => asyncResponseCustomLabel,
      }
    };
  };

  // const getDownloadChunkSetting = (): Settings => {
  //   const onDownloadChunkChange 
  // }


  const networkingSectionProps: SettingSectionProps = {
    id: 'networking',
    title: 'Networking',
    expanded: false,
    settings: [
      getAsyncPatternSetting(),
      getAsyncResponseSetting(),
      // getDownloadChunkSettind(),
      // getUploadChunkSetting(),
      // getPaginationSetting(),
      // getRetryPolicySetting(),
      // getRequestOptionSetting(),
      // getSuppressHeadersSetting(),
      // getWorkflowHeadersOnResponseSetting(),
    ]
  }


  return <SettingsSection {...networkingSectionProps} />;
}