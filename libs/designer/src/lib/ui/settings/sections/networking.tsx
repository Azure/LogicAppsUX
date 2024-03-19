import type { DropdownSelectionChangeHandler, SectionProps, TextChangeHandler, ToggleHandler } from '..';
import { SettingSectionName } from '..';
import constants from '../../../common/constants';
import type { Settings, SettingsSectionProps } from '../settingsection';
import { SettingsSection } from '../settingsection';
import { getSettingLabel } from '@microsoft/designer-ui';
import { useIntl } from 'react-intl';

export interface NetworkingSectionProps extends SectionProps {
  chunkedTransferMode: boolean;
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
}

export const Networking = ({
  readOnly,
  expanded,
  validationErrors,
  retryPolicy,
  suppressWorkflowHeaders,
  suppressWorkflowHeadersOnResponse,
  paging,
  uploadChunk,
  downloadChunkSize,
  asynchronous,
  disableAsyncPattern,
  requestOptions,
  chunkedTransferMode,
  onAsyncPatternToggle,
  onAsyncResponseToggle,
  onRequestOptionsChange,
  onSuppressHeadersToggle,
  onPaginationToggle,
  onPaginationValueChange,
  onHeadersOnResponseToggle,
  onContentTransferToggle,
  onRetryPolicyChange,
  onRetryCountChange,
  onRetryIntervalChange,
  onRetryMinIntervalChange,
  onRetryMaxIntervalChange,
  onHeaderClick,
}: NetworkingSectionProps): JSX.Element => {
  const intl = useIntl();
  const asyncPatternTitle = intl.formatMessage({
    defaultMessage: 'Asynchronous Pattern',
    id: 'J/Kz1j',
    description: 'title for async pattern setting',
  });
  const asyncPatternTooltipText = intl.formatMessage({
    defaultMessage: `With the asynchronous pattern, if the remote server indicates that the request is accepted for processing with a 202 (Accepted) response, the Logic Apps engine will keep polling the URL specified in the response's location header until reaching a terminal state.`,
    id: '8j+a0n',
    description: 'description of asynchronous pattern setting',
  });
  const asyncResponseTitle = intl.formatMessage({
    defaultMessage: 'Asynchronous Response',
    id: 'i/b3Ko',
    description: 'title for asynchronous response setting',
  });
  const asyncResponseTooltipText = intl.formatMessage({
    defaultMessage:
      'Asynchronous response allows a Logic App to respond with a 202 (Accepted) to indicate the request has been accepted for processing. A location header will be provided to retrieve the final state.',
    id: 'qrxi0L',
    description: 'description of asynchronous response setting',
  });
  const requestOptionsTitle = intl.formatMessage({
    defaultMessage: 'Request Options - Timeout',
    id: 'jO5Fet',
    description: 'title for request options setting',
  });
  const requestOptionsPlaceholder = intl.formatMessage({
    defaultMessage: 'Example: PT1S',
    id: 'f7Janv',
    description: 'Placeholder for time setting, leave PT1S untranslated',
  });
  const requestOptionsTooltipText = intl.formatMessage({
    defaultMessage: `The maximum duration on a single outbound request from this action. If the request doesn't finish within this limit after running retries, the action fails`,
    id: 'Dm0zAO',
    description: 'description of request options duration setting',
  });
  const requestOptionsDescription = intl.formatMessage({
    defaultMessage: 'Specify the duration in ISO 8601 format',
    id: 'WS55UF',
    description: 'description of request options duration setting',
  });
  const requestOptionsSublabel = intl.formatMessage({
    defaultMessage: 'Duration',
    id: 'viee6C',
    description: 'sublabel for request options duration setting',
  });
  const suppressWorkflowHeadersTitle = intl.formatMessage({
    defaultMessage: 'Suppress workflow headers',
    id: 'nZ4nLn',
    description: 'title for suppress workflow headers setting',
  });
  const suppressWorkflowHeadersTooltipText = intl.formatMessage({
    defaultMessage: 'Limit Logic Apps to not include workflow metadata headers in the outgoing request.',
    id: 'mjS/k1',
    description: 'description of suppress woers setting',
  });
  const paginationTitle = intl.formatMessage({
    defaultMessage: 'Pagination',
    id: 'iTKrs8',
    description: 'Title for pagination setting',
  });
  const paginationTooltipText = intl.formatMessage({
    defaultMessage: 'Retrieve more results up to the pagination limit',
    id: 'cJkSrD',
    description: 'tooltip text of pagination setting',
  });
  const paginationDescription = intl.formatMessage({
    defaultMessage: `Retrieve items to meet the specified threshold by following the continuation token. Due to connector's page size, the number returned may exceed the threshold.`,
    id: 'C4NQ1J',
    description: 'description for pagination setting',
  });
  const paginationPlaceholder = intl.formatMessage({
    defaultMessage: 'Threshold of items to return',
    id: 'm8z4Yr',
    description: 'placeholder for pagination setting',
  });
  const threshold = intl.formatMessage({
    defaultMessage: 'Threshold',
    id: 'xQQ9ko',
    description: 'title for pagination user input',
  });
  const workflowHeadersOnResponseTitle = intl.formatMessage({
    defaultMessage: 'Suppress Workflow Headers on Response',
    id: '+v1RlQ',
    description: 'title for workflow headers on response setting',
  });
  const workflowHeadersOnResponseTooltipText = intl.formatMessage({
    defaultMessage: 'Limit Logic Apps to not include workflow metadata headers in the response.',
    id: 'XsktQ/',
    description: 'description of workflow headers on response setting',
  });
  const networking = intl.formatMessage({
    defaultMessage: 'Networking',
    id: 'i4C4aB',
    description: 'title for networking setting section',
  });
  const contentTransferTitle = intl.formatMessage({
    defaultMessage: 'Content Transfer',
    id: 'oLtwMw',
    description: 'title for content transfer setting',
  });
  const contentTransferTooltip = intl.formatMessage({
    defaultMessage: 'More details can be found at http://aka.ms/logicapps-chunk#upload-content-in-chunks',
    id: 'V+xi3c',
    description: 'description of content transfer setting',
  });
  const contentTransferDescription = intl.formatMessage({
    defaultMessage:
      'Specify the behavior and capabilities for transferring content over HTTP. Large messages may be split up into smaller requests to the connector to allow large message upload.',
    id: 'SenWwt',
    description: 'description of content transfer setting',
  });
  const contentTransferSublabel = intl.formatMessage({
    defaultMessage: 'Allow chunking',
    id: 'hMf2TA',
    description: 'sublabel for content transfer setting',
  });

  // RETRY POLICY
  const retryPolicyTypeTitle = intl.formatMessage({
    defaultMessage: 'Retry Policy',
    id: '4IS4yp',
    description: 'title for retry policy setting',
  });
  const retryPolicyTooltip = intl.formatMessage({
    defaultMessage: 'The number of times to retry the request',
    id: '1hPZqe',
    description: 'description of retry count setting',
  });
  const retryPolicyTypeDescription = intl.formatMessage({
    defaultMessage:
      'A retry policy applies to intermittent failures, characterized as HTTP status codes 408, 429, and 5xx, in addition to any connectivity exceptions. The default is an exponential interval policy set to retry 4 times.',
    id: 'zNesUZ',
    description: 'description of retry policy setting',
  });
  const retryPolicyCountTitle = intl.formatMessage({
    defaultMessage: 'Count',
    id: 'XbtEq9',
    description: 'title for retry count setting',
  });

  const retryPolicyCountPlaceholder = intl.formatMessage({
    defaultMessage: 'Specify a retry count from 1 to 90',
    id: 'uM1i27',
    description: 'placeholder for retry count setting',
  });
  const retryPolicyIntervalTitle = intl.formatMessage({
    defaultMessage: 'Interval',
    id: 'V8A+1J',
    description: 'Title for retry interval setting',
  });
  const retryPolicyIntervalDescription = intl.formatMessage({
    defaultMessage: 'Specify interval in ISO 8601 format.',
    id: 'h40rpg',
    description: 'description of retry interval setting',
  });
  const retryPolicyIntervalPlaceholder = intl.formatMessage(
    {
      defaultMessage: 'Example: {example}',
      id: 'qiIs4V',
      description: 'placeholder for retry interval setting',
    },
    {
      example: 'PT20S',
    }
  );
  const retryPolicyMinIntervalTitle = intl.formatMessage({
    defaultMessage: 'Minimum Interval',
    id: 'r7vZ5a',
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
    defaultMessage: 'Maximum Interval',
    id: 'AsqIUa',
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
      visible: requestOptions?.isSupported,
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
          contentTransferTooltip,
          contentTransferDescription,
          contentTransferSublabel,
          /* isSubLabelToggle*/ true
        ),
        ariaLabel: contentTransferTitle,
      },
      visible: uploadChunk?.isSupported || downloadChunkSize?.isSupported,
    };
  };

  const getRetryPolicySetting = (): Settings => {
    const items = [
      {
        title: intl.formatMessage({
          defaultMessage: 'Default',
          id: '2uINs9',
          description: 'title for retry policy default setting',
        }),
        value: constants.RETRY_POLICY_TYPE.DEFAULT,
      },
      {
        title: intl.formatMessage({
          defaultMessage: 'None',
          id: 'gL4rVQ',
          description: 'title for retry policy none setting',
        }),
        value: constants.RETRY_POLICY_TYPE.NONE,
      },
      {
        title: intl.formatMessage({
          defaultMessage: 'Exponential Interval',
          id: '7zDk9N',
          description: 'title for retry policy exponential interval setting',
        }),
        value: constants.RETRY_POLICY_TYPE.EXPONENTIAL,
      },
      {
        title: intl.formatMessage({
          defaultMessage: 'Fixed Interval',
          id: 'Wb/cBR',
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
    title: networking,
    sectionName: SettingSectionName.NETWORKING,
    expanded,
    onHeaderClick,
    settings: [
      getAsyncPatternSetting(),
      getAsyncResponseSetting(),
      getContentTransferSetting(),
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
