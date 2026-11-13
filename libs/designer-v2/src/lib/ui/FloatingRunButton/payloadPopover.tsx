import type { OptionOnSelectData, SelectionEvents } from '@fluentui/react-components';
import { Button, Dropdown, Field, Input, Option, Popover, PopoverSurface } from '@fluentui/react-components';
import { MonacoEditor, SimpleDictionary } from '@microsoft/designer-ui';
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { getPayloadPopoverMaxHeight } from './payloadPopoverLayout';
import { usePayloadPopoverStyles } from './styles';
import type { PayloadData } from './index';

type PayloadPopoverProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  buttonRef: React.RefObject<HTMLButtonElement>;
  onSubmit: (data: PayloadData) => void;
  isDraftMode?: boolean;
  relativePathParameterNames?: string[];
};

export const PayloadPopover = ({
  open,
  setOpen,
  buttonRef,
  onSubmit,
  isDraftMode,
  relativePathParameterNames = [],
}: PayloadPopoverProps) => {
  const styles = usePayloadPopoverStyles();

  const intl = useIntl();
  const [maxHeight, setMaxHeight] = useState<number | undefined>();

  const [method, setMethod] = useState('POST');
  const methodOptions = ['POST', 'GET', 'PUT', 'PATCH', 'DELETE'];
  const methodLabel = intl.formatMessage({
    defaultMessage: 'Method',
    id: '2bBUCc',
    description: 'HTTP method label',
  });
  const onMethodSelect = (_event: SelectionEvents, data: OptionOnSelectData) => {
    setMethod(data.selectedOptions?.[0]);
  };

  const [headersValue, setHeadersValue] = useState<Record<string, string> | undefined>({
    'Content-Type': 'application/json',
  });
  const headersLabel = intl.formatMessage({
    defaultMessage: 'Headers',
    id: 'zCozKy',
    description: 'HTTP headers label',
  });

  const [queriesValue, setQueriesValue] = useState<Record<string, string> | undefined>(undefined);
  const queriesLabel = intl.formatMessage({
    defaultMessage: 'Queries',
    id: 'mB14zV',
    description: 'HTTP queries label',
  });

  const [relativePathValues, setRelativePathValues] = useState<Record<string, string>>({});
  const relativePathLabel = intl.formatMessage({
    defaultMessage: 'Relative path',
    id: '4CSg8f',
    description: 'Label for request trigger relative path parameters in the run payload popover',
  });
  const relativePathValuePlaceholder = intl.formatMessage({
    defaultMessage: 'Value',
    id: 'mPAMOR',
    description: 'Placeholder for a relative path parameter value in the run payload popover',
  });

  const [bodyValue, setBodyValue] = useState<string | undefined>(undefined);
  const [bodyError, setBodyError] = useState<string | undefined>(undefined);
  const bodyLabel = intl.formatMessage({
    defaultMessage: 'Body',
    id: 'aFZRms',
    description: 'HTTP body label',
  });

  const validateJson = useCallback((value: string | undefined): boolean => {
    if (!value || value.trim() === '') {
      setBodyError(undefined);
      return true;
    }
    try {
      JSON.parse(value);
      setBodyError(undefined);
      return true;
    } catch (error) {
      setBodyError((error as Error).message);
      return false;
    }
  }, []);

  const onBodyValueChange = useCallback(
    (value: string | undefined) => {
      setBodyValue(value);
      if (headersValue?.['Content-Type'] === 'application/json') {
        validateJson(value);
      }
    },
    [headersValue, validateJson]
  );

  const resetPayload = useCallback(() => {
    setMethod('POST');
    setHeadersValue({
      'Content-Type': 'application/json',
    });
    setQueriesValue(undefined);
    setRelativePathValues({});
    setBodyValue(undefined);
    setBodyError(undefined);
  }, []);

  useEffect(() => {
    if (open) {
      resetPayload();
    }
  }, [open, resetPayload]);

  useLayoutEffect(() => {
    if (!open) {
      return;
    }

    const measure = () => {
      setMaxHeight(getPayloadPopoverMaxHeight(buttonRef.current));
    };
    measure();
    const frame = window.requestAnimationFrame(measure);
    window.addEventListener('resize', measure);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', measure);
    };
  }, [open, buttonRef]);

  const runButtonText = intl.formatMessage({
    defaultMessage: 'Run with payload',
    id: '+Uz9M+',
    description: 'Run with payload button text',
  });

  const runDraftButtonText = intl.formatMessage({
    defaultMessage: 'Run draft with payload',
    id: 'X8pCBI',
    description: 'Run draft with payload button text',
  });

  const onRunClick = useCallback(() => {
    onSubmit({
      method,
      headers: headersValue,
      queries: queriesValue,
      body: bodyValue,
      ...(relativePathParameterNames.length > 0
        ? {
            relativePathParameters: Object.fromEntries(relativePathParameterNames.map((name) => [name, relativePathValues[name] ?? ''])),
          }
        : {}),
    });
    setOpen(false);
  }, [onSubmit, method, headersValue, queriesValue, bodyValue, relativePathParameterNames, relativePathValues, setOpen]);

  const relativePathIncomplete = relativePathParameterNames.some((name) => !(relativePathValues[name] ?? '').trim());
  const runDisabled = useMemo(() => !!bodyError || !method || relativePathIncomplete, [bodyError, method, relativePathIncomplete]);

  return (
    <Popover
      onOpenChange={(e, data) => setOpen(data.open)}
      trapFocus
      withArrow
      open={open}
      inline
      positioning={{ target: buttonRef.current, position: 'above', align: 'center' }}
    >
      <PopoverSurface className={styles.surface} style={{ maxHeight: maxHeight ?? 'calc(100vh - 220px)', overflowY: 'auto' }}>
        <div className={styles.root}>
          {/* Method */}
          <Field label={methodLabel}>
            <Dropdown
              value={method}
              defaultValue={method}
              defaultSelectedOptions={[method]}
              onOptionSelect={onMethodSelect}
              disabled={isDraftMode}
            >
              {methodOptions.map((option) => (
                <Option key={option} value={option}>
                  {option}
                </Option>
              ))}
            </Dropdown>
          </Field>
          {/* Headers */}
          <Field label={headersLabel}>
            <SimpleDictionary value={headersValue} onChange={setHeadersValue} />
          </Field>
          {/* Queries */}
          <Field label={queriesLabel}>
            <SimpleDictionary value={queriesValue} onChange={setQueriesValue} />
          </Field>
          {relativePathParameterNames.length > 0 ? (
            <Field label={relativePathLabel}>
              <div className={styles.relativePathList}>
                {relativePathParameterNames.map((name) => (
                  <div key={name} className={styles.relativePathRow}>
                    <Input aria-label={`${relativePathLabel} ${name} key`} value={name} readOnly />
                    <Input
                      aria-label={`${relativePathLabel} ${name}`}
                      value={relativePathValues[name] ?? ''}
                      placeholder={relativePathValuePlaceholder}
                      onChange={(_event, data) => {
                        setRelativePathValues((current) => ({ ...current, [name]: data.value }));
                      }}
                    />
                    <span />
                  </div>
                ))}
              </div>
            </Field>
          ) : null}
          {/* Body */}
          <Field
            label={bodyLabel}
            className={styles.monacoEditor}
            validationMessage={bodyError}
            validationState={bodyError ? 'error' : 'none'}
          >
            <MonacoEditor
              key={'body-editor'}
              height={'200px'}
              language={'json'}
              value={bodyValue}
              folding={true}
              onContentChanged={(e) => onBodyValueChange(e.value)}
              lineNumbersMinChars={3}
            />
          </Field>
          <Button appearance={'primary'} onClick={onRunClick} className={styles.runButton} disabled={runDisabled}>
            {isDraftMode ? runDraftButtonText : runButtonText}
          </Button>
        </div>
      </PopoverSurface>
    </Popover>
  );
};
