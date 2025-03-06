import type React from 'react';
import { useEffect, useState } from 'react';
import { Toggle } from '@fluentui/react/lib/Toggle';
import type { ChangeHandler, ValueSegment } from '@microsoft/logic-apps-shared';
import { addUseSchemaEditor, checkIsSchemaEditor } from './mixedinputeditorhelper';
import { FloatingActionMenuInputs } from '../floatingactionmenu/floatingactionmenuinputs';
import { SchemaEditor } from '../schemaeditor';
import { useIntl } from 'react-intl';

interface MixedInputEditorProps {
  initialValue: ValueSegment[];
  onChange: ChangeHandler;
  supportedTypes?: string[];
  isRequestApiConnectionTrigger?: boolean;
  label?: string;
  readonly?: boolean;
  useStaticInputs: boolean;
}

export const MixedInputEditor: React.FC<MixedInputEditorProps> = ({
  initialValue,
  onChange,
  supportedTypes,
  isRequestApiConnectionTrigger,
  label,
  readonly,
  useStaticInputs,
}) => {
  const intl = useIntl();
  // ...
  const toggleLabel = intl.formatMessage({
    defaultMessage: 'Use Schema Editor',
    id: '96498b1e4e12',
    description: 'Toggle to use schema editor',
  });
  const [isSchemaEditor, setIsSchemaEditor] = useState<boolean>(() => {
    const storedToggleValue = localStorage.getItem('mixedInputEditor_toggle');
    const hasSchemaEditor = checkIsSchemaEditor(initialValue);

    if (storedToggleValue === null) {
      return hasSchemaEditor;
    }
    const stateFromStorage = storedToggleValue === 'true';
    return stateFromStorage && hasSchemaEditor;
  });

  useEffect(() => {
    if (isSchemaEditor) {
      const updatedValue = addUseSchemaEditor(initialValue);
      if (JSON.stringify(updatedValue) !== JSON.stringify(initialValue)) {
        onChange?.({ value: updatedValue });
      }
      if (localStorage.getItem('mixedInputEditor_toggle') !== 'true') {
        localStorage.setItem('mixedInputEditor_toggle', 'true');
      }
    } else if (localStorage.getItem('mixedInputEditor_toggle') === 'true') {
      localStorage.setItem('mixedInputEditor_toggle', 'false');
    }
  }, [isSchemaEditor, initialValue, onChange]);

  const handleToggleChange = (ev: React.MouseEvent<HTMLElement>, checked?: boolean) => {
    setIsSchemaEditor(checked ?? false);
  };

  return (
    <div>
      <Toggle label={toggleLabel} checked={isSchemaEditor} onChange={handleToggleChange} disabled={readonly} />
      {isSchemaEditor ? (
        <SchemaEditor initialValue={initialValue} onChange={onChange} readonly={readonly} label={label} />
      ) : (
        <FloatingActionMenuInputs
          initialValue={initialValue}
          onChange={onChange}
          supportedTypes={supportedTypes ?? []}
          isRequestApiConnectionTrigger={isRequestApiConnectionTrigger}
          useStaticInputs={useStaticInputs}
        />
      )}
    </div>
  );
};
