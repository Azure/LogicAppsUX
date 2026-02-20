import {
  Button,
  Drawer,
  DrawerBody,
  DrawerFooter,
  DrawerHeader,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Text,
} from '@fluentui/react-components';
import { bundleIcon, Dismiss24Filled, Dismiss24Regular } from '@fluentui/react-icons';
import { DatePicker } from '@fluentui/react-datepicker-compat';
import { TimePicker, type TimeSelectionData, type TimeSelectionEvents, formatDateToTimeString } from '@fluentui/react-timepicker-compat';
import { closePanel } from '../../../../core/state/mcp/panel/mcpPanelSlice';
import type { AppDispatch, RootState } from '../../../../core/state/mcp/store';
import { useDispatch, useSelector } from 'react-redux';
import { useMcpPanelStyles, useMcpServerPanelStyles } from '../styles';
import { useIntl } from 'react-intl';
import { useCallback, useMemo, useState } from 'react';
import {
  CopyInputControl,
  type TemplatePanelFooterProps,
  TemplatesPanelFooter,
  TemplatesSection,
  type TemplatesSectionItem,
} from '@microsoft/designer-ui';
import { addExpiryToCurrent, generateKeys } from '../../../../core/mcp/utils/server';
import { getStandardLogicAppId } from '../../../../core/configuretemplate/utils/helper';
import { equals } from '@microsoft/logic-apps-shared';

const CloseIcon = bundleIcon(Dismiss24Filled, Dismiss24Regular);

export const GenerateKeys = () => {
  const styles = { ...useMcpPanelStyles(), ...useMcpServerPanelStyles() };
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();

  const { subscriptionId, resourceGroup, logicAppName } = useSelector((state: RootState) => ({
    subscriptionId: state.resource.subscriptionId,
    resourceGroup: state.resource.resourceGroup,
    logicAppName: state.resource.logicAppName,
  }));
  const logicAppId = useMemo(
    () => getStandardLogicAppId(subscriptionId, resourceGroup, logicAppName ?? ''),
    [subscriptionId, resourceGroup, logicAppName]
  );

  const INTL_TEXT = {
    title: intl.formatMessage({
      defaultMessage: 'Generate MCP API key',
      id: '3DEbi3',
      description: 'Title for the MCP generate keys panel',
    }),
    closeAriaLabel: intl.formatMessage({
      defaultMessage: 'Close',
      id: 'wgikZJ',
      description: 'Aria label for closing the MCP generate keys panel',
    }),
    detailsTitle: intl.formatMessage({
      defaultMessage: 'Key access duration',
      id: 'AfJvdR',
      description: 'Title for the MCP generate keys details section',
    }),
    detailsDescription: intl.formatMessage({
      defaultMessage:
        'Set how long this key should be valid. This key will be shown only once and cannot be retrieved later. The key is not stored on Azure, save it securely. You will need to regenerate the key if lost.',
      id: 'Vfa/1M',
      description: 'Description for the MCP generate keys section',
    }),
    resultTitle: intl.formatMessage({
      defaultMessage: 'MCP API key',
      id: 'Jx88eq',
      description: 'Title for the MCP Server workflows section',
    }),
    resultDescription: intl.formatMessage({
      defaultMessage:
        'Save MCP API key information in a secure location, it will not be available later. The old API keys will still work based on their expiration date. If access keys are regenerated that would invalidate all access keys.',
      id: 'XOMMsL',
      description: 'Description for the MCP Server workflows section',
    }),
    learnMoreLinkText: intl.formatMessage({
      defaultMessage: 'Learn more',
      id: 'm0e5px',
      description: 'Link text for learn more',
    }),
    infoTitle: intl.formatMessage({
      defaultMessage: 'Successfully generated the key.',
      id: 'Tfsaaf',
      description: 'Info message title about key generation',
    }),
    infoMessage: intl.formatMessage({
      defaultMessage: `Copy and save this key in a secure location. The key won't be shown again.`,
      id: 'jz3Z3W',
      description: 'Info message about key generation',
    }),
    durationLabel: intl.formatMessage({
      defaultMessage: 'Duration (days)',
      id: '6DsS1M',
      description: 'Label for the key duration input field',
    }),
    accessKeyLabel: intl.formatMessage({
      defaultMessage: 'Access key',
      id: 'ORqQxz',
      description: 'Label for the access key',
    }),
    accessKeyInfoText: intl.formatMessage({
      defaultMessage: 'Select the access key you want to generate your keys from',
      id: 'dxNeLe',
      description: 'Info text for access key selection',
    }),
    hoursText: intl.formatMessage({
      defaultMessage: 'hours',
      id: 'x74tKg',
      description: 'Text for hours',
    }),
    daysText: intl.formatMessage({
      defaultMessage: 'days',
      id: 'j7HEKm',
      description: 'Text for days',
    }),
    neverExpiresText: intl.formatMessage({
      defaultMessage: 'Never expires',
      id: 'crvmH2',
      description: 'Text for never expires',
    }),
    customText: intl.formatMessage({
      defaultMessage: 'Custom',
      id: '8DgDf+',
      description: 'Text for custom option',
    }),
    selectDateTimeLabel: intl.formatMessage({
      defaultMessage: 'Select date and time',
      id: 'S2KtbJ',
      description: 'Label for custom date time picker',
    }),
    primaryKeyText: intl.formatMessage({
      defaultMessage: 'Primary key',
      id: 'HOwcCC',
      description: 'Text for primary access key',
    }),
    secondaryKeyText: intl.formatMessage({
      defaultMessage: 'Secondary key',
      id: 'T7aD3v',
      description: 'Text for secondary access key',
    }),
    apiKeyLabel: intl.formatMessage({
      defaultMessage: 'API key',
      id: 'duhwio',
      description: 'Label for the API key',
    }),
    expiresLabel: intl.formatMessage({
      defaultMessage: 'Expires',
      id: 'GxdV2y',
      description: 'Label for the key expiration',
    }),
    generateButtonText: intl.formatMessage({
      defaultMessage: 'Generate',
      id: 'EOx5fA',
      description: 'Button text for creating the MCP Server',
    }),
    closeButtonText: intl.formatMessage({
      defaultMessage: 'Close',
      id: '8cgUrz',
      description: 'Button text for closing MCP Server creation',
    }),
  };
  const durationOptions = useMemo(() => {
    return [
      { id: '1', label: `24 ${INTL_TEXT.hoursText}`, value: '24h' },
      { id: '2', label: `7 ${INTL_TEXT.daysText}`, value: '7d' },
      { id: '3', label: `30 ${INTL_TEXT.daysText}`, value: '30d' },
      { id: '4', label: `90 ${INTL_TEXT.daysText}`, value: '90d' },
      { id: '5', label: INTL_TEXT.neverExpiresText, value: 'noexpiry' },
      { id: '6', label: INTL_TEXT.customText, value: 'custom' },
    ];
  }, [INTL_TEXT.daysText, INTL_TEXT.hoursText, INTL_TEXT.neverExpiresText, INTL_TEXT.customText]);
  const keysOptions = useMemo(() => {
    return [
      { id: 'primary', label: INTL_TEXT.primaryKeyText, value: 'primary' },
      { id: 'secondary', label: INTL_TEXT.secondaryKeyText, value: 'secondary' },
    ];
  }, [INTL_TEXT.primaryKeyText, INTL_TEXT.secondaryKeyText]);

  const [duration, setDuration] = useState('24h');
  const [accessKey, setAccessKey] = useState('primary');
  const [customDateTime, setCustomDateTime] = useState<string | undefined>(undefined);

  const [generatedKey, setGeneratedKey] = useState<string | undefined>(undefined);
  const [expiresTime, setExpiresTime] = useState<string | undefined>(undefined);
  const [showSuccessInfo, setShowSuccessInfo] = useState<boolean>(false);
  const [dateTimeError, setDateTimeError] = useState<string | undefined>(undefined);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);

  const onDurationSelect = useCallback((options: string[]) => {
    setDuration(options[0]);

    if (options[0] !== 'custom') {
      setCustomDateTime(undefined);
      setDateTimeError(undefined);
    }
  }, []);

  const keySectionItems: TemplatesSectionItem[] = useMemo(() => {
    const items: TemplatesSectionItem[] = [
      {
        label: INTL_TEXT.durationLabel,
        value: duration ? durationOptions.find((option) => option.value === duration)?.label : undefined,
        type: 'dropdown',
        required: true,
        options: durationOptions,
        controlled: true,
        selectedOptions: duration ? [duration] : [],
        onOptionSelect: onDurationSelect,
      },
      {
        label: INTL_TEXT.accessKeyLabel,
        value: accessKey ? keysOptions.find((option) => option.value === accessKey)?.label : undefined,
        description: INTL_TEXT.accessKeyInfoText,
        type: 'dropdown',
        required: true,
        options: keysOptions,
        controlled: true,
        selectedOptions: accessKey ? [accessKey] : [],
        onOptionSelect: (options) => setAccessKey(options[0]),
      },
    ];

    if (duration === 'custom') {
      items.splice(1, 0, {
        label: INTL_TEXT.selectDateTimeLabel,
        value: '',
        type: 'custom',
        required: true,
        errorMessage: dateTimeError,
        onRenderItem: () => (
          <TimePickerWithDatePicker
            onSelect={(selectedTime: string) => {
              setCustomDateTime(selectedTime);
              setDateTimeError(undefined);
            }}
            setError={setDateTimeError}
          />
        ),
      });
    }

    return items;
  }, [
    INTL_TEXT.durationLabel,
    INTL_TEXT.accessKeyLabel,
    INTL_TEXT.accessKeyInfoText,
    INTL_TEXT.selectDateTimeLabel,
    duration,
    durationOptions,
    onDurationSelect,
    accessKey,
    keysOptions,
    dateTimeError,
  ]);

  const generatedSectionItems: TemplatesSectionItem[] = useMemo(() => {
    return [
      {
        label: INTL_TEXT.apiKeyLabel,
        value: generatedKey,
        type: 'custom',
        onRenderItem: () => <CopyInputControl text={generatedKey ?? ''} />,
      },
      {
        label: INTL_TEXT.expiresLabel,
        value: expiresTime,
        type: 'text',
      },
    ];
  }, [INTL_TEXT.apiKeyLabel, INTL_TEXT.expiresLabel, generatedKey, expiresTime]);

  const handleGenerate = useCallback(async () => {
    const expiryTime = equals(duration, 'custom')
      ? (customDateTime as string)
      : duration.endsWith('h')
        ? addExpiryToCurrent(Number.parseInt(duration.replace('h', '')))
        : duration.endsWith('d')
          ? addExpiryToCurrent(/* hours */ undefined, Number.parseInt(duration.replace('d', '')))
          : 'noexpiry';

    try {
      const key = await generateKeys(logicAppId, expiryTime, accessKey);
      setGeneratedKey(key);
      setExpiresTime(expiryTime === 'noexpiry' ? INTL_TEXT.neverExpiresText : expiryTime);
      setShowSuccessInfo(true);
      setErrorMessage(undefined);
    } catch (error: any) {
      setErrorMessage(error.message);
    }
  }, [duration, customDateTime, logicAppId, accessKey, INTL_TEXT.neverExpiresText]);

  const handleClose = useCallback(() => {
    dispatch(closePanel());
  }, [dispatch]);

  const renderInfoBar = useCallback(() => {
    return (
      <div className={styles.messageBar}>
        <MessageBar intent={'success'}>
          <MessageBarBody className={styles.messageBarBody}>
            <MessageBarTitle>{INTL_TEXT.infoTitle}</MessageBarTitle>
            {INTL_TEXT.infoMessage}
          </MessageBarBody>
        </MessageBar>
      </div>
    );
  }, [styles.messageBar, styles.messageBarBody, INTL_TEXT.infoTitle, INTL_TEXT.infoMessage]);

  const renderErrorBar = useCallback(() => {
    return (
      <MessageBar intent={'error'}>
        <MessageBarBody className={styles.messageBarBody}>{errorMessage}</MessageBarBody>
      </MessageBar>
    );
  }, [styles.messageBarBody, errorMessage]);

  const footerContent: TemplatePanelFooterProps = useMemo(() => {
    return {
      buttonContents: [
        {
          type: 'action',
          text: INTL_TEXT.generateButtonText,
          appearance: 'primary',
          onClick: handleGenerate,
          disabled: !duration || !accessKey || (duration === 'custom' && (!customDateTime || !!dateTimeError)),
        },
        {
          type: 'action',
          text: INTL_TEXT.closeButtonText,
          onClick: handleClose,
        },
      ],
    };
  }, [
    INTL_TEXT.generateButtonText,
    INTL_TEXT.closeButtonText,
    handleGenerate,
    duration,
    accessKey,
    customDateTime,
    dateTimeError,
    handleClose,
  ]);
  return (
    <Drawer className={styles.generateKeysContainer} open={true} onOpenChange={(_, { open }) => !open && handleClose()} position="end">
      <DrawerHeader className={styles.header}>
        <div className={styles.headerContent}>
          <Text size={600} weight="semibold" style={{ flex: 1 }}>
            {INTL_TEXT.title}
          </Text>
          <Button appearance="subtle" icon={<CloseIcon />} onClick={handleClose} aria-label={INTL_TEXT.closeAriaLabel} />
        </div>
      </DrawerHeader>
      <DrawerBody className={styles.body}>
        <TemplatesSection
          cssOverrides={{ sectionItems: styles.workflowSection }}
          title={INTL_TEXT.detailsTitle}
          description={INTL_TEXT.detailsDescription}
          descriptionLink={{
            text: INTL_TEXT.learnMoreLinkText,
            href: 'https://go.microsoft.com/fwlink/?linkid=2348014',
          }}
          items={keySectionItems}
        />
        {errorMessage ? renderErrorBar() : null}
        {showSuccessInfo && !errorMessage ? (
          <TemplatesSection
            cssOverrides={{ sectionItems: styles.workflowSection }}
            title={INTL_TEXT.resultTitle}
            description={INTL_TEXT.resultDescription}
            descriptionLink={{
              text: INTL_TEXT.learnMoreLinkText,
              href: 'https://go.microsoft.com/fwlink/?linkid=2347946',
            }}
            items={generatedSectionItems}
            onRenderInfoBar={renderInfoBar}
          />
        ) : null}
      </DrawerBody>
      <DrawerFooter className={styles.footer}>
        <TemplatesPanelFooter {...footerContent} />
      </DrawerFooter>
    </Drawer>
  );
};

const TimePickerWithDatePicker = ({
  onSelect,
  setError,
}: { onSelect: (selectedTime: string) => void; setError: (error: string | undefined) => void }): JSX.Element => {
  const styles = useMcpServerPanelStyles();
  const intl = useIntl();
  const INTL_TEXT = {
    selectDateText: intl.formatMessage({
      defaultMessage: 'Select a date...',
      id: 'hbmiUp',
      description: 'Placeholder text for date picker',
    }),
    selectTimeText: intl.formatMessage({
      defaultMessage: 'Select a time...',
      id: '96v4Tz',
      description: 'Placeholder text for time picker',
    }),
    futureTimeErrorText: intl.formatMessage({
      defaultMessage: 'Please select a future time.',
      id: 'gl0im8',
      description: 'Error message for selecting past time',
    }),
    invalidTimeFormatErrorText: intl.formatMessage({
      defaultMessage: 'Please enter a valid time format (e.g., 2:30 PM).',
      id: '3c7eHH',
      description: 'Error message for invalid time format',
    }),
  };

  const minDate = useMemo(() => new Date(), []);
  const [selectedDate, setSelectedDate] = useState<Date | null | undefined>(null);
  const [selectedTime, setSelectedTime] = useState<Date | null>(null);
  const [timePickerValue, setTimePickerValue] = useState<string>(selectedTime ? formatDateToTimeString(selectedTime) : '');

  const handleDateTimeSelection = useCallback(
    (date: Date | null | undefined, time: Date | null | undefined) => {
      if (date && time) {
        const newDateTime = new Date(date.getFullYear(), date.getMonth(), date.getDate(), time.getHours(), time.getMinutes());

        const today = new Date();

        if (today.getDate() === date.getDate() && today.getTime() > time.getTime()) {
          setError(INTL_TEXT.futureTimeErrorText);
          return;
        }

        onSelect(newDateTime.toISOString());
      } else if (date) {
        onSelect(date.toISOString());
      }
    },
    [INTL_TEXT.futureTimeErrorText, onSelect, setError]
  );

  const handleInvalidTimeSelection = useCallback(() => {
    setSelectedTime(null);
    handleDateTimeSelection(selectedDate, null);
    setError(INTL_TEXT.invalidTimeFormatErrorText);
  }, [INTL_TEXT.invalidTimeFormatErrorText, handleDateTimeSelection, selectedDate, setError]);

  const onSelectDate = useCallback(
    (date: Date | null | undefined) => {
      setSelectedDate(date);
      handleDateTimeSelection(date, selectedTime);
    },
    [handleDateTimeSelection, selectedTime]
  );

  const onTimeChange = useCallback(
    (_: TimeSelectionEvents, data: TimeSelectionData) => {
      setSelectedTime(data.selectedTime);
      setTimePickerValue(data.selectedTimeText ?? '');

      if (selectedDate && data.selectedTime) {
        handleDateTimeSelection(selectedDate, data.selectedTime);
      }
    },
    [handleDateTimeSelection, selectedDate]
  );

  const onTimePickerInput = useCallback((ev: React.ChangeEvent<HTMLInputElement>) => {
    setTimePickerValue(ev.target.value);
  }, []);

  const onTimePickerBlur = useCallback(() => {
    if (timePickerValue) {
      const normalizedTime = timePickerValue.toLowerCase().replace(/\s+/g, '');
      const morningTime = normalizedTime.endsWith('am') ? normalizedTime.replace('am', '') : undefined;
      const eveningTime = normalizedTime.endsWith('pm') ? normalizedTime.replace('pm', '') : undefined;
      const timeParts = morningTime ? morningTime.split(':') : eveningTime ? eveningTime.split(':') : [];

      if (timeParts.length === 0) {
        // Invalid time format, so time change won't be processed
        return handleInvalidTimeSelection();
      }

      let hours = Number.parseInt(timeParts[0]);
      const minutes = timeParts.length > 1 ? Number.parseInt(timeParts[1]) : 0;

      if (Number.isNaN(hours) || Number.isNaN(minutes) || hours < 0 || hours > 12 || minutes < 0 || minutes > 59) {
        return handleInvalidTimeSelection();
      }

      if (eveningTime && hours < 12) {
        hours += 12;
      } else if (morningTime && hours === 12) {
        hours = 0;
      }

      const newTime = new Date(new Date().setHours(hours, minutes));
      setSelectedTime(newTime);

      if (selectedDate && newTime) {
        handleDateTimeSelection(selectedDate, newTime);
      }
    }
  }, [handleDateTimeSelection, handleInvalidTimeSelection, selectedDate, timePickerValue]);
  return (
    <div className={styles.dateTimeContainer}>
      <DatePicker
        placeholder={INTL_TEXT.selectDateText}
        value={selectedDate}
        inlinePopup={true}
        minDate={minDate}
        onSelectDate={onSelectDate}
      />
      <TimePicker
        className={styles.timePicker}
        placeholder={INTL_TEXT.selectTimeText}
        dateAnchor={selectedDate ?? undefined}
        selectedTime={selectedTime}
        onTimeChange={onTimeChange}
        value={timePickerValue}
        inlinePopup={true}
        freeform={true}
        onInput={onTimePickerInput}
        onBlur={onTimePickerBlur}
      />
    </div>
  );
};
