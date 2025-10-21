import type { OptionOnSelectData, SelectionEvents } from '@fluentui/react-components';
import { Button, Dropdown, Field, Option, Popover, PopoverSurface } from '@fluentui/react-components';
import { MonacoEditor, SimpleDictionary } from '@microsoft/designer-ui';
import { useCallback, useState } from 'react';
import { useIntl } from 'react-intl';
import { usePayloadPopoverStyles } from './styles';

type PayloadData = {
  method?: string;
  headers?: Record<string, string>;
  queries?: Record<string, string>;
  body?: string;
};

type PayloadPopoverProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  buttonRef: React.RefObject<HTMLButtonElement>;
  onSubmit: (data: PayloadData) => void;
  isDraftMode?: boolean;
};

export const PayloadPopover = ({ open, setOpen, buttonRef, onSubmit, isDraftMode }: PayloadPopoverProps) => {
  const styles = usePayloadPopoverStyles();

  const intl = useIntl();

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

  const [bodyValue, setBodyValue] = useState<string | undefined>(undefined);
  const [jsonError, setJsonError] = useState<string | undefined>(undefined);
  const bodyLabel = intl.formatMessage({
    defaultMessage: 'Body',
    id: 'aFZRms',
    description: 'HTTP body label',
  });

  const runButtonText = intl.formatMessage({
    defaultMessage: 'Run with payload',
    id: '+Uz9M+',
    description: 'Run with payload button text',
  });

  const validateJson = useCallback((value: string | undefined): boolean => {
    if (!value || value.trim() === '') {
      setJsonError(undefined);
      return true;
    }
    try {
      JSON.parse(value);
      setJsonError(undefined);
      return true;
    } catch (error) {
      setJsonError((error as Error).message);
      return false;
    }
  }, []);

  const onBodyValueChange = useCallback(
    (value: string | undefined) => {
      setBodyValue(value);
      if (isDraftMode) {
        validateJson(value);
      }
    },
    [isDraftMode, validateJson]
  );

  const onRunClick = useCallback(() => {
    if (isDraftMode) {
      onSubmit({
        body: bodyValue,
        headers: { 'Content-Type': 'application/json' },
      });
    } else {
      onSubmit({
        method,
        headers: headersValue,
        queries: queriesValue,
        body: bodyValue,
      });
    }
    setOpen(false);
  }, [onSubmit, method, headersValue, queriesValue, bodyValue, setOpen, isDraftMode]);

  return (
    <Popover
      onOpenChange={(e, data) => setOpen(data.open)}
      trapFocus
      withArrow
      open={open}
      inline
      positioning={{ target: buttonRef.current }}
    >
      <PopoverSurface>
        <div className={styles.root}>
          {isDraftMode ? (
            // Draft mode: Only Monaco editor with JSON
            <>
              <Field label={bodyLabel} validationMessage={jsonError} validationState={jsonError ? 'error' : 'none'}>
                <MonacoEditor
                  height={'200px'}
                  language={'json'}
                  value={bodyValue}
                  folding={true}
                  onContentChanged={(e) => onBodyValueChange(e.value)}
                  lineNumbersMinChars={3}
                />
              </Field>
              <Button appearance={'primary'} onClick={onRunClick} className={styles.runButton} disabled={!!jsonError}>
                {runButtonText}
              </Button>
            </>
          ) : (
            // Non-draft mode: Full form with all fields
            <>
              {/* Method */}
              <Field label={methodLabel}>
                <Dropdown value={method} defaultSelectedOptions={[method]} onOptionSelect={onMethodSelect}>
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
              {/* Body */}
              <Field label={bodyLabel} className={styles.monacoEditor}>
                <MonacoEditor
                  // key={"body-editor"}
                  height={'200px'}
                  language={'json'}
                  value={bodyValue}
                  folding={true}
                  onContentChanged={(e) => onBodyValueChange(e.value)}
                  lineNumbersMinChars={3}
                />
              </Field>
              <Button appearance={'primary'} onClick={onRunClick} className={styles.runButton}>
                {runButtonText}
              </Button>
            </>
          )}
        </div>
      </PopoverSurface>
    </Popover>
  );
};
