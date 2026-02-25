import { useCallback, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { Switch } from '@fluentui/react-components';
import type { ValueSegment } from '../editor';
import type { ChangeHandler } from '../editor/base';
import { createLiteralValueSegment } from '../editor/base/utils/helper';
import { useBuiltinToolsStyles } from './styles';

export interface BuiltinToolOption {
  value: string;
  displayName: string;
  description: string;
}

export interface BuiltinToolsEditorProps {
  initialValue: ValueSegment[];
  options?: BuiltinToolOption[];
  readonly?: boolean;
  onChange?: ChangeHandler;
}

export const BuiltinToolsEditor = ({ initialValue, options = [], readonly, onChange }: BuiltinToolsEditorProps): JSX.Element => {
  const intl = useIntl();
  const styles = useBuiltinToolsStyles();

  const headerText = intl.formatMessage({
    defaultMessage: 'Built-in Tools',
    id: 'AkKqDo',
    description: 'Header label for the built-in tools section in agent loop settings',
  });

  const enabledTools = useMemo((): string[] => {
    try {
      const raw = initialValue.map((s) => s.value).join('');
      if (!raw) {
        return [];
      }
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [initialValue]);

  const handleToggle = useCallback(
    (toolValue: string, checked: boolean) => {
      const updated = checked
        ? enabledTools.includes(toolValue)
          ? enabledTools
          : [...enabledTools, toolValue]
        : enabledTools.filter((t) => t !== toolValue);
      const serialized = JSON.stringify(updated);
      onChange?.({ value: [createLiteralValueSegment(serialized)] });
    },
    [enabledTools, onChange]
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>{headerText}</div>
      {options.map((option) => (
        <div key={option.value} className={styles.toolRow}>
          <div className={styles.toolInfo}>
            <span className={styles.toolName}>{option.displayName}</span>
            <span className={styles.toolDescription}>{option.description}</span>
          </div>
          <Switch
            checked={enabledTools.includes(option.value)}
            disabled={readonly}
            onChange={(_ev, data) => handleToggle(option.value, data.checked)}
          />
        </div>
      ))}
    </div>
  );
};
