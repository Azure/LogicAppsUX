import type { DownloadChunkMetadata, UploadChunkMetadata } from '@microsoft/logic-apps-shared';
import type { DropdownSelectionChangeHandler, SectionProps, TextChangeHandler, ToggleHandler } from '..';
import { SettingSectionName } from '..';
import constants from '../../../common/constants';
import type { Settings, SettingsSectionProps } from '../settingsection';
import { SettingsSection } from '../settingsection';
import { getSettingLabel } from '@microsoft/designer-ui';
import { useIntl } from 'react-intl';
import { useLegacyWorkflowParameters } from '../../../core/state/designerOptions/designerOptionsSelectors';

export interface NetworkingSectionProps extends SectionProps {
  chunkedTransferMode: boolean;
  uploadChunkMetadata: UploadChunkMetadata | undefined;
  downloadChunkMetadata: DownloadChunkMetadata | undefined;
  hideContentTransferSettings: boolean | undefined;
  onAsyncPatternToggle: ToggleHandler;
  onAsyncResponseToggle: ToggleHandler;
  onRequestOptionsChange: TextChangeHandler;
  onSuppressHeadersToggle: ToggleHandler;
  onPaginationToggle: ToggleHandler;
  onPaginationValueChange: TextChangeHandler;
  onHeadersOnResponseToggle: ToggleHandler;
  onContentTransferToggle: ToggleHandler;
  onRetryPolicyChange: DropdownSelectionChangeHandler;
  onRetryCountChange: TextChangeHandler;
  onRetryIntervalChange: TextChangeHandler;
  onRetryMinIntervalChange: TextChangeHandler;
  onRetryMaxIntervalChange: TextChangeHandler;
  onUploadChunkSizeChange: TextChangeHandler;
  onDownloadChunkSizeChange: TextChangeHandler;
}

export const Networking = ({
  nodeId,
  readOnly,
  expanded,
  validationErrors,
  retryPolicy,
  suppressWorkflowHeaders,
  suppressWorkflowHeadersOnResponse,
  paging,
  uploadChunk,
  uploadChunkMetadata,
  downloadChunkMetadata,
  downloadChunkSize,
  asynchronous,
  disableAsyncPattern,
  requestOptions,
  chunkedTransferMode,
  hideContentTransferSettings,
  onAsyncPatternToggle,
  onAsyncResponseToggle,
  onRequestOptionsChange,
  onSuppressHeadersToggle,
  onPaginationToggle,
  onPaginationValueChange,
  onHeadersOnResponseToggle,
  onContentTransferToggle,
  onUploadChunkSizeChange,
  onDownloadChunkSizeChange,
  onRetryPolicyChange,
  onRetryCountChange,
  onRetryIntervalChange,
  onRetryMinIntervalChange,
  onRetryMaxIntervalChange,
  onHeaderClick,
}: NetworkingSectionProps): JSX.Element => {
  const minimumSize = uploadChunkMetadata?.minimumSize ?? downloadChunkMetadata?.minimumSize;
  const maximumSize = uploadChunkMetadata?.maximumSize ?? downloadChunkMetadata?.maximumSize;
  const useLegacyConsumptionCheck = !!useLegacyWorkflowParameters();

  const intl = useIntl();
  const asyncPatternTitle = intl.formatMessage({
    defaultMessage: 'Asynchronous pattern',
    id: '60cd1edc2dfb',
    description: 'title for async pattern setting',
  });
  const asyncPatternTooltipText = intl.formatMessage({
    defaultMessage: `With the asynchronous pattern, if the remote server indicates that the request is accepted for processing with a 202 (Accepted) response, the Logic Apps engine will keep polling the URL specified in the response's location header until reaching a terminal state.`,
    id: 'f23f9ad2789f',
    description: 'description of asynchronous pattern setting',
  });
  const asyncResponseTitle = intl.formatMessage({
    defaultMessage: 'Asynchronous response',
    id: '206a55d56192',
    description: 'title for asynchronous response setting',
  });
  const asyncResponseTooltipText = intl.formatMessage({
    defaultMessage:
      'Asynchronous response allows a Logic App to respond with a 202 (Accepted) to indicate the request has been accepted for processing. A location header will be provided to retrieve the final state.',
    id: 'aabc62d0b83e',
    description: 'description of asynchronous response setting',
  });
  const requestOptionsTitle = intl.formatMessage({
    defaultMessage: 'Request options - Timeout',
    id: '7d23320c9f63',
    description: 'title for request options setting',
  });
  const requestOptionsPlaceholder = intl.formatMessage({
    defaultMessage: 'Example: PT1S',
    id: '7fb25a9efcc2',
    description: 'Placeholder for time setting, leave PT1S untranslated',
  });
  const requestOptionsTooltipText = intl.formatMessage({
    defaultMessage: `The maximum duration on a single outbound request from this action. If the request doesn't finish within this limit after running retries, the action fails`,
    id: '0e6d3300e763',
    description: 'description of request options duration setting',
  });
  const requestOptionsDescription = intl.formatMessage({
    defaultMessage: 'Specify the duration in ISO 8601 format',
    id: '592e795055b8',
    description: 'description of request options duration setting',
  });
  const requestOptionsSublabel = intl.formatMessage({
    defaultMessage: 'Duration',
    id: 'be279ee8236c',
    description: 'sublabel for request options duration setting',
  });
  const suppressWorkflowHeadersTitle = intl.formatMessage({
    defaultMessage: 'Suppress workflow headers',
    id: '9d9e272e73e1',
    description: 'title for suppress workflow headers setting',
  });
  const suppressWorkflowHeadersTooltipText = intl.formatMessage({
    defaultMessage: 'Limit Logic Apps to not include workflow metadata headers in the outgoing request.',
    id: '9a34bf9359b2',
    description: 'description of suppress woers setting',
  });
  const paginationTitle = intl.formatMessage({
    defaultMessage: 'Pagination',
    id: '8932abb3c784',
    description: 'Title for pagination setting',
  });
  const paginationTooltipText = intl.formatMessage({
    defaultMessage: 'Retrieve more results up to the pagination limit',
    id: '709912ac3c1a',
    description: 'tooltip text of pagination setting',
  });
  const paginationDescription = intl.formatMessage({
    defaultMessage: `Retrieve items to meet the specified threshold by following the continuation token. Due to connector's page size, the number returned may exceed the threshold.`,
    id: '0b8350d4995a',
    description: 'description for pagination setting',
  });
  const paginationPlaceholder = intl.formatMessage({
    defaultMessage: 'Threshold of items to return',
    id: '9bccf862ba12',
    description: 'placeholder for pagination setting',
  });
  const threshold = intl.formatMessage({
    defaultMessage: 'Threshold',
    id: 'c5043d928be8',
    description: 'title for pagination user input',
  });
  const workflowHeadersOnResponseTitle = intl.formatMessage({
    defaultMessage: 'Suppress workflow headers on response',
    id: 'f3095f7684f8',
    description: 'title for workflow headers on response setting',
  });
  const workflowHeadersOnResponseTooltipText = intl.formatMessage({
    defaultMessage: 'Limit Logic Apps to not include workflow metadata headers in the response.',
    id: '5ec92d43ff3f',
    description: 'description of workflow headers on response setting',
  });
  const networking = intl.formatMessage({
    defaultMessage: 'Networking',
    id: '8b80b8681bf3',
    description: 'title for networking setting section',
  });
  const contentTransferTitle = intl.formatMessage({
    defaultMessage: 'Content transfer',
    id: '5d9acc1994de',
    description: 'title for content transfer setting',
  });
  const uploadContentTransferDescription = intl.formatMessage({
    defaultMessage: 'Specify the behavior and capabilities for transferring content over HTTP.',
    id: 'e01b82770ed8',
    description: 'description of upload content transfer setting',
  });
  const uploadContentTransferTooltip = intl.formatMessage({
    defaultMessage:
      'Large messages may be split up into smaller requests to the connector to allow large message upload. More details can be found at http://aka.ms/logicapps-chunk#upload-content-in-chunks',
    id: '95bab9135b67',
    description: 'description of upload content transfer setting',
  });
  const downloadContentTransferDescription = intl.formatMessage({
    defaultMessage: 'Specify the behavior and capabilities for transferring content over HTTP.',
    id: 'a5f9a48bfc53',
    description: 'description of download content transfer setting',
  });
  const contentTransferSublabel = intl.formatMessage({
    defaultMessage: 'Allow chunking',
    id: '84c7f64c0f48',
    description: 'sublabel for content transfer setting',
  });
  const chunkedTransferNodeSizeLabel = intl.formatMessage({
    defaultMessage: 'Chunk size',
    id: '49359b6a4998',
    description: 'label for chunked transfer node size',
  });
  const uploadChunkSizePlaceholder = intl.formatMessage(
    {
      defaultMessage: 'Specify upload chunk size between {minimumSize} and {maximumSize} Mb. Example: 10',
      id: '0fa2b3a12ed8',
      description: 'tooltip for upload chunk size setting',
    },
    { minimumSize, maximumSize }
  );
  const downloadChunkSizePlaceholder = intl.formatMessage(
    {
      defaultMessage: 'Specify download chunk size between {minimumSize} and {maximumSize} Mb. Example: 10',
      id: '22a344ba2ca9',
      description: 'tooltip for download chunk size setting',
    },
    { minimumSize, maximumSize }
  );

  // RETRY POLICY
  const retryPolicyTypeTitle = intl.formatMessage({
    defaultMessage: 'Retry policy',
    id: 'e8b259ee77ef',
    description: 'title for retry policy setting',
  });
  const retryPolicyTooltip = intl.formatMessage({
    defaultMessage: 'The number of times to retry the request',
    id: 'd613d9a9e312',
    description: 'description of retry count setting',
  });
  const retryPolicyTypeDescription = intl.formatMessage({
    defaultMessage:
      'A retry policy applies to intermittent failures, characterized as HTTP status codes 408, 429, and 5xx, in addition to any connectivity exceptions. The default is an exponential interval policy set to retry 4 times.',
    id: 'ccd7ac519f15',
    description: 'description of retry policy setting',
  });
  const retryPolicyCountTitle = intl.formatMessage({
    defaultMessage: 'Count',
    id: '5dbb44abd7ec',
    description: 'title for retry count setting',
  });

  const retryPolicyCountPlaceholder = intl.formatMessage({
    defaultMessage: 'Specify a retry count from 1 to 90',
    id: 'b8cd62dbb3ab',
    description: 'placeholder for retry count setting',
  });
  const retryPolicyIntervalTitle = intl.formatMessage({
    defaultMessage: 'Interval',
    id: '57c03ed49bc3',
    description: 'Title for retry interval setting',
  });
  const retryPolicyIntervalDescription = intl.formatMessage({
    defaultMessage: 'Specify interval in ISO 8601 format.',
    id: '878d2ba604c2',
    description: 'description of retry interval setting',
  });
  const retryPolicyIntervalPlaceholder = intl.formatMessage(
    {
      defaultMessage: 'Example: {example}',
      id: 'aa222ce15baf',
      description: 'placeholder for retry interval setting',
    },
    {
      example: 'PT20S',
    }
  );
  const retryPolicyMinIntervalTitle = intl.formatMessage({
    defaultMessage: 'Minimum interval',
    id: 'c4c80b77c94d',
    description: 'title for retry minimum interval setting',
  });
  const retryPolicyMinIntervalPlaceholder = intl.formatMessage(
    {
      defaultMessage: 'Example: {example}',
      id: 'qiIs4V',
      description: 'placeholder for retry interval setting',
    },
    {
      example: 'PT10S',
    }
  );
  const retryPolicyMaxIntervalTitle = intl.formatMessage({
    defaultMessage: 'Maximum interval',
    id: 'd9a76a438a3f',
    description: 'title for retry maximum interval setting',
  });
  const retryPolicyMaxIntervalPlaceholder = intl.formatMessage(
    {
      defaultMessage: 'Example: {example}',
      id: 'qiIs4V',
      description: 'placeholder for retry interval setting',
    },
    {
      example: 'PT1H',
    }
  );

  const getAsyncPatternSetting = (): Settings => {
    return {
      settingType: 'SettingToggle',
      settingProp: {
        readOnly,
        checked: !disableAsyncPattern?.value,
        onToggleInputChange: (_, checked) => onAsyncPatternToggle(!checked),
        customLabel: getSettingLabel(asyncPatternTitle, asyncPatternTooltipText),
        inlineLabel: true,
        ariaLabel: asyncPatternTitle,
      },
      visible: disableAsyncPattern?.isSupported,
    };
  };

  const getAsyncResponseSetting = (): Settings => {
    return {
      settingType: 'SettingToggle',
      settingProp: {
        readOnly,
        checked: asynchronous?.value,
        onToggleInputChange: (_, checked) => onAsyncResponseToggle(!!checked),
        customLabel: getSettingLabel(asyncResponseTitle, asyncResponseTooltipText),
        ariaLabel: asyncResponseTitle,
      },
      visible: asynchronous?.isSupported,
    };
  };

  const getRequestOptionSetting = (): Settings => {
    return {
      settingType: 'SettingTextField',
      settingProp: {
        readOnly,
        value: requestOptions?.value?.timeout ?? '',
        placeholder: requestOptionsPlaceholder,
        customLabel: getSettingLabel(requestOptionsTitle, requestOptionsTooltipText, requestOptionsDescription, requestOptionsSublabel),
        onValueChange: (_, newVal) => onRequestOptionsChange(newVal as string),
        ariaLabel: requestOptionsTitle,
      },
      visible: requestOptions?.isSupported && !useLegacyConsumptionCheck,
    };
  };

  const getSuppressHeadersSetting = (): Settings => {
    return {
      settingType: 'SettingToggle',
      settingProp: {
        readOnly,
        checked: suppressWorkflowHeaders?.value,
        customLabel: getSettingLabel(suppressWorkflowHeadersTitle, suppressWorkflowHeadersTooltipText),
        onToggleInputChange: (_, checked) => onSuppressHeadersToggle(!!checked),
        ariaLabel: suppressWorkflowHeadersTitle,
      },
      visible: suppressWorkflowHeaders?.isSupported,
    };
  };

  const getPaginationSetting = (): Settings => {
    return {
      settingType: 'ReactiveToggle',
      settingProp: {
        readOnly,
        textFieldLabel: threshold,
        textFieldValue: paging?.value?.value?.toString() ?? '',
        textFieldPlaceholder: paginationPlaceholder,
        checked: paging?.value?.enabled,
        onToggleInputChange: (_, checked) => onPaginationToggle(!!checked),
        onValueChange: (_, newVal) => onPaginationValueChange(newVal as string),
        customLabel: getSettingLabel(paginationTitle, paginationTooltipText, paginationDescription),
        ariaLabel: paginationTitle,
      },
      visible: paging?.isSupported,
    };
  };

  const getWorkflowHeadersOnResponseSetting = (): Settings => {
    return {
      settingType: 'SettingToggle',
      settingProp: {
        readOnly,
        checked: suppressWorkflowHeadersOnResponse?.value,
        customLabel: getSettingLabel(workflowHeadersOnResponseTitle, workflowHeadersOnResponseTooltipText),
        onToggleInputChange: (_, checked) => onHeadersOnResponseToggle(!!checked),
        ariaLabel: workflowHeadersOnResponseTitle,
      },
      visible: suppressWorkflowHeadersOnResponse?.isSupported,
    };
  };

  const getContentTransferSetting = (): Settings => {
    return {
      settingType: 'SettingToggle',
      settingProp: {
        checked: chunkedTransferMode,
        readOnly,
        onToggleInputChange: (_, checked) => onContentTransferToggle(!!checked),
        customLabel: getSettingLabel(
          contentTransferTitle,
          uploadContentTransferTooltip,
          uploadContentTransferDescription,
          contentTransferSublabel,
          /* isSubLabelToggle*/ true
        ),
        ariaLabel: contentTransferTitle,
      },
      visible: !!uploadChunk?.isSupported,
    };
  };

  const getUploadChunkSizeSetting = (): Settings => {
    return {
      settingType: 'SettingTextField',
      settingProp: {
        readOnly,
        value: uploadChunk?.value?.uploadChunkSize?.toString() ?? '',
        placeholder: uploadChunkSizePlaceholder,
        customLabel: getSettingLabel('', /* infoTooltipText */ undefined, /* SettingDescription */ undefined, chunkedTransferNodeSizeLabel),
        onValueChange: (_, newVal) => onUploadChunkSizeChange(newVal as string),
        ariaLabel: chunkedTransferNodeSizeLabel,
      },
      visible: uploadChunk?.isSupported && uploadChunkMetadata?.acceptUploadSize && chunkedTransferMode,
    };
  };

  const getDownloadChunkSizeSetting = (): Settings => {
    return {
      settingType: 'SettingTextField',
      settingProp: {
        readOnly,
        value: downloadChunkSize?.value?.toString() ?? '',
        placeholder: downloadChunkSizePlaceholder,
        customLabel: getSettingLabel(
          contentTransferTitle,
          /* infoTooltipText */ undefined,
          downloadContentTransferDescription,
          chunkedTransferNodeSizeLabel
        ),
        onValueChange: (_, newVal) => onDownloadChunkSizeChange(newVal as string),
        ariaLabel: chunkedTransferNodeSizeLabel,
      },
      visible: hideContentTransferSettings ? !hideContentTransferSettings : downloadChunkMetadata?.acceptDownloadSize,
    };
  };

  const getRetryPolicySetting = (): Settings => {
    const items = [
      {
        title: intl.formatMessage({
          defaultMessage: 'Default',
          id: 'dae20db3d9d7',
          description: 'title for retry policy default setting',
        }),
        value: constants.RETRY_POLICY_TYPE.DEFAULT,
      },
      {
        title: intl.formatMessage({
          defaultMessage: 'None',
          id: '80be2b5501c3',
          description: 'title for retry policy none setting',
        }),
        value: constants.RETRY_POLICY_TYPE.NONE,
      },
      {
        title: intl.formatMessage({
          defaultMessage: 'Exponential interval',
          id: 'a21a5b930596',
          description: 'title for retry policy exponential interval setting',
        }),
        value: constants.RETRY_POLICY_TYPE.EXPONENTIAL,
      },
      {
        title: intl.formatMessage({
          defaultMessage: 'Fixed interval',
          id: 'd5fecb1b8976',
          description: 'title for retry policy fixed interval setting',
        }),
        value: constants.RETRY_POLICY_TYPE.FIXED,
      },
    ];

    // TODO: Implement custom retry policy logic (couldn't find any connectors that use this though)

    return {
      settingType: 'SettingDropdown',
      settingProp: {
        id: 'retryPolicy',
        readOnly,
        items,
        selectedValue: retryPolicy?.value?.type,
        onSelectionChanged: onRetryPolicyChange,
        customLabel: getSettingLabel(retryPolicyTypeTitle, retryPolicyTooltip, retryPolicyTypeDescription),
        ariaLabel: retryPolicyTypeTitle,
      },
      visible: retryPolicy?.isSupported,
    };
  };

  const getRetryCountSetting = (): Settings => {
    return {
      settingType: 'SettingTextField',
      settingProp: {
        readOnly,
        value: retryPolicy?.value?.count?.toString() ?? '',
        placeholder: retryPolicyCountPlaceholder,
        customLabel: getSettingLabel(retryPolicyCountTitle),
        onValueChange: (_, newVal) => onRetryCountChange(newVal as string),
        required: true,
        ariaLabel: retryPolicyCountTitle,
      },
      visible:
        retryPolicy?.isSupported &&
        retryPolicy?.value?.type !== constants.RETRY_POLICY_TYPE.NONE &&
        retryPolicy?.value?.type !== constants.RETRY_POLICY_TYPE.DEFAULT,
    };
  };

  const getRetryIntervalSetting = (): Settings => {
    return {
      settingType: 'SettingTextField',
      settingProp: {
        readOnly,
        value: retryPolicy?.value?.interval ?? '',
        placeholder: retryPolicyIntervalPlaceholder,
        customLabel: getSettingLabel(retryPolicyIntervalTitle, retryPolicyIntervalDescription),
        onValueChange: (_, newVal) => onRetryIntervalChange(newVal as string),
        required: true,
        ariaLabel: retryPolicyIntervalTitle,
      },
      visible:
        retryPolicy?.isSupported &&
        retryPolicy?.value?.type !== constants.RETRY_POLICY_TYPE.NONE &&
        retryPolicy?.value?.type !== constants.RETRY_POLICY_TYPE.DEFAULT,
    };
  };

  const getRetryMinIntervalSetting = (): Settings => {
    return {
      settingType: 'SettingTextField',
      settingProp: {
        readOnly,
        value: retryPolicy?.value?.minimumInterval ?? '',
        placeholder: retryPolicyMinIntervalPlaceholder,
        customLabel: getSettingLabel(retryPolicyMinIntervalTitle, retryPolicyIntervalDescription),
        onValueChange: (_, newVal) => onRetryMinIntervalChange(newVal as string),
        ariaLabel: retryPolicyMinIntervalTitle,
      },
      visible: retryPolicy?.isSupported && retryPolicy?.value?.type === constants.RETRY_POLICY_TYPE.EXPONENTIAL,
    };
  };

  const getRetryMaxIntervalSetting = (): Settings => {
    return {
      settingType: 'SettingTextField',
      settingProp: {
        readOnly,
        value: retryPolicy?.value?.maximumInterval ?? '',
        placeholder: retryPolicyMaxIntervalPlaceholder,
        customLabel: getSettingLabel(retryPolicyMaxIntervalTitle, retryPolicyIntervalDescription),
        onValueChange: (_, newVal) => onRetryMaxIntervalChange(newVal as string),
        ariaLabel: retryPolicyMaxIntervalTitle,
      },
      visible: retryPolicy?.isSupported && retryPolicy?.value?.type === constants.RETRY_POLICY_TYPE.EXPONENTIAL,
    };
  };

  const networkingSectionProps: SettingsSectionProps = {
    id: 'networking',
    nodeId,
    title: networking,
    sectionName: SettingSectionName.NETWORKING,
    expanded,
    onHeaderClick,
    settings: [
      getAsyncPatternSetting(),
      getAsyncResponseSetting(),
      getContentTransferSetting(),
      getUploadChunkSizeSetting(),
      getDownloadChunkSizeSetting(),
      getPaginationSetting(),
      getRequestOptionSetting(),
      getSuppressHeadersSetting(),
      getWorkflowHeadersOnResponseSetting(),
      getRetryPolicySetting(),
      getRetryCountSetting(),
      getRetryIntervalSetting(),
      getRetryMinIntervalSetting(),
      getRetryMaxIntervalSetting(),
    ],
    validationErrors,
  };

  return <SettingsSection {...networkingSectionProps} />;
};
