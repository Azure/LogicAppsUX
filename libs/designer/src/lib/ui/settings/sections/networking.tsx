import type { DropdownSelectionChangeHandler, SectionProps, TextChangeHandler, ToggleHandler } from '..';
import constants from '../../../common/constants';
import type { Settings, SettingsSectionProps } from '../settingsection';
import { SettingsSection, SettingLabel } from '../settingsection';
import { useIntl } from 'react-intl';

export interface NetworkingSectionProps extends SectionProps {
  onAsyncPatternToggle: ToggleHandler;
  onAsyncResponseToggle: ToggleHandler;
  onRequestOptionsChange: TextChangeHandler;
  onSuppressHeadersToggle: ToggleHandler;
  onPaginationToggle: ToggleHandler;
  onPaginationValueChange: TextChangeHandler;
  onHeadersOnResponseToggle: ToggleHandler;
  onContentTransferToggle: ToggleHandler;
  chunkedTransferMode: boolean;
  onRetryPolicyChange: DropdownSelectionChangeHandler;
  onRetryCountChange: TextChangeHandler;
  onRetryIntervalChange: TextChangeHandler;
  onRetryMinIntervalChange: TextChangeHandler;
  onRetryMaxIntervalChange: TextChangeHandler;
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
  onPaginationToggle,
  onPaginationValueChange,
  onHeadersOnResponseToggle,
  onContentTransferToggle,
  chunkedTransferMode,
  onRetryPolicyChange,
  onRetryCountChange,
  onRetryIntervalChange,
  onRetryMinIntervalChange,
  onRetryMaxIntervalChange,
  expanded,
  onHeaderClick,
  retryPolicy,
  validationErrors,
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

  // RETRY POLICY
  const retryPolicyTypeTitle = intl.formatMessage({
    defaultMessage: 'Retry Policy',
    description: 'title for retry policy setting',
  });
  const retryPolicyTypeDescription = intl.formatMessage({
    defaultMessage:
      'A retry policy applies to intermittent failures, characterized as HTTP status codes 408, 429, and 5xx, in addition to any connectivity exceptions. The default is an exponential interval policy set to retry 4 times.',
    description: 'description of retry policy setting',
  });
  const retryPolicyCountTitle = intl.formatMessage({
    defaultMessage: 'Count',
    description: 'title for retry count setting',
  });
  // const retryPolicyCountDescription = intl.formatMessage({
  //   defaultMessage: 'The number of times to retry the request.',
  //   description: 'description of retry count setting',
  // });
  const retryPolicyCountPlaceholder = intl.formatMessage({
    defaultMessage: 'Specify a retry count from 1 to 90',
    description: 'placeholder for retry count setting',
  });
  const retryPolicyIntervalTitle = intl.formatMessage({
    defaultMessage: 'Interval',
    description: 'title for retry interval setting',
  });
  const retryPolicyIntervalDescription = intl.formatMessage({
    defaultMessage: 'Specify interval in ISO 8601 format.',
    description: 'description of retry interval setting',
  });
  const retryPolicyIntervalPlaceholder = intl.formatMessage(
    {
      defaultMessage: 'Example: {example}',
      description: 'placeholder for retry interval setting',
    },
    {
      example: 'PT20S',
    }
  );
  const retryPolicyMinIntervalTitle = intl.formatMessage({
    defaultMessage: 'Minimum Interval',
    description: 'title for retry minimum interval setting',
  });
  const retryPolicyMinIntervalPlaceholder = intl.formatMessage(
    {
      defaultMessage: 'Example: {example}',
      description: 'placeholder for retry interval setting',
    },
    {
      example: 'PT10S',
    }
  );
  const retryPolicyMaxIntervalTitle = intl.formatMessage({
    defaultMessage: 'Maximum Interval',
    description: 'title for retry maximum interval setting',
  });
  const retryPolicyMaxIntervalPlaceholder = intl.formatMessage(
    {
      defaultMessage: 'Example: {example}',
      description: 'placeholder for retry interval setting',
    },
    {
      example: 'PT1H',
    }
  );

  const getAsyncPatternSetting = (): Settings => {
    const asyncPatternCustomLabel = (
      <SettingLabel labelText={asyncPatternTitle} infoTooltipText={asyncPatternTooltipText} isChild={false} />
    );
    return {
      settingType: 'SettingToggle',
      settingProp: {
        readOnly,
        checked: !disableAsyncPattern?.value,
        onToggleInputChange: (_, checked) => onAsyncPatternToggle(!checked),
        customLabel: () => asyncPatternCustomLabel,
        inlineLabel: true,
        onText,
        offText,
        ariaLabel: asyncPatternTitle,
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
        ariaLabel: asyncResponseTitle,
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
        ariaLabel: requestOptionsTitle,
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
        ariaLabel: suppressWorkflowHeadersTitle,
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
        textFieldValue: paging?.value?.value?.toString() ?? '',
        checked: paging?.value?.enabled,
        onToggleLabel: onText,
        offToggleLabel: offText,
        onToggleInputChange: (_, checked) => onPaginationToggle(!!checked),
        onValueChange: (_, newVal) => onPaginationValueChange(newVal as string),
        customLabel: () => pagingCustomLabel,
        ariaLabel: paginationTitle,
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
        ariaLabel: workflowHeadersOnResponseTitle,
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
        onToggleInputChange: (_, checked) => onContentTransferToggle(!!checked),
        customLabel: () => contentTransferLabel,
        ariaLabel: contentTransferTitle,
      },
      visible: uploadChunk?.isSupported || downloadChunkSize?.isSupported,
    };
  };

  const getRetryPolicySetting = (): Settings => {
    const retryPolicyLabel = <SettingLabel labelText={retryPolicyTypeTitle} infoTooltipText={retryPolicyTypeDescription} isChild={false} />;

    const items = [
      { title: 'Default', value: constants.RETRY_POLICY_TYPE.DEFAULT },
      { title: 'None', value: constants.RETRY_POLICY_TYPE.NONE },
      { title: 'Exponential Interval', value: constants.RETRY_POLICY_TYPE.EXPONENTIAL },
      { title: 'Fixed Interval', value: constants.RETRY_POLICY_TYPE.FIXED },
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
        customLabel: () => retryPolicyLabel,
        ariaLabel: retryPolicyTypeTitle,
      },
      visible: retryPolicy?.isSupported,
    };
  };

  const getRetryCountSetting = (): Settings => {
    const retryCountLabel = <SettingLabel labelText={retryPolicyCountTitle} isChild={false} />;

    return {
      settingType: 'SettingTextField',
      settingProp: {
        readOnly,
        value: retryPolicy?.value?.count?.toString() ?? '',
        placeholder: retryPolicyCountPlaceholder,
        customLabel: () => retryCountLabel,
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
    const retryIntervalLabel = (
      <SettingLabel labelText={retryPolicyIntervalTitle} infoTooltipText={retryPolicyIntervalDescription} isChild={false} />
    );

    return {
      settingType: 'SettingTextField',
      settingProp: {
        readOnly,
        value: retryPolicy?.value?.interval ?? '',
        placeholder: retryPolicyIntervalPlaceholder,
        customLabel: () => retryIntervalLabel,
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
    const retryMinIntervalLabel = (
      <SettingLabel labelText={retryPolicyMinIntervalTitle} infoTooltipText={retryPolicyIntervalDescription} isChild={false} />
    );

    return {
      settingType: 'SettingTextField',
      settingProp: {
        readOnly,
        value: retryPolicy?.value?.minimumInterval ?? '',
        placeholder: retryPolicyMinIntervalPlaceholder,
        customLabel: () => retryMinIntervalLabel,
        onValueChange: (_, newVal) => onRetryMinIntervalChange(newVal as string),
        ariaLabel: retryPolicyMinIntervalTitle,
      },
      visible: retryPolicy?.isSupported && retryPolicy?.value?.type === constants.RETRY_POLICY_TYPE.EXPONENTIAL,
    };
  };

  const getRetryMaxIntervalSetting = (): Settings => {
    const retryMaxIntervalLabel = (
      <SettingLabel labelText={retryPolicyMaxIntervalTitle} infoTooltipText={retryPolicyIntervalDescription} isChild={false} />
    );

    return {
      settingType: 'SettingTextField',
      settingProp: {
        readOnly,
        value: retryPolicy?.value?.maximumInterval ?? '',
        placeholder: retryPolicyMaxIntervalPlaceholder,
        customLabel: () => retryMaxIntervalLabel,
        onValueChange: (_, newVal) => onRetryMaxIntervalChange(newVal as string),
        ariaLabel: retryPolicyMaxIntervalTitle,
      },
      visible: retryPolicy?.isSupported && retryPolicy?.value?.type === constants.RETRY_POLICY_TYPE.EXPONENTIAL,
    };
  };

  const networkingSectionProps: SettingsSectionProps = {
    id: 'networking',
    title: networking,
    sectionName: constants.SETTINGSECTIONS.NETWORKING,
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
