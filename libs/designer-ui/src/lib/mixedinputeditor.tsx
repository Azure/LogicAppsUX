import type React from 'react';
import { useEffect, useState } from 'react';
import { Toggle } from '@fluentui/react/lib/Toggle';
import type { ChangeHandler, ValueSegment } from '@microsoft/logic-apps-shared';
import { SchemaEditor } from './schemaeditor';
import { FloatingActionMenuInputs } from './floatingactionmenu/floatingactionmenuinputs';

interface MixedInputEditorProps {
  initialValue: ValueSegment[];
  onChange: ChangeHandler;
  supportedTypes?: string[];
  isRequestApiConnectionTrigger?: boolean;
  label?: string;
  readonly?: boolean;
  useStaticInputs: boolean;
}

// Function to check if `initialValue` contains "useSchemaEditor": true
const checkIsSchemaEditor = (initialValue: ValueSegment[]): boolean => {
  return initialValue.some((segment) => {
    try {
      const parsedValue = JSON.parse(segment.value);
      return parsedValue?.useSchemaEditor === true;
    } catch (error) {
      console.error('Error parsing value segment:', error);
      return false;
    }
  });
};

// Function to add "useSchemaEditor": true if it's missing
const addUseSchemaEditor = (value: ValueSegment[]): ValueSegment[] => {
  const updatedValue = value.map((segment) => {
    try {
      const parsedValue = JSON.parse(segment.value);
      if (parsedValue && !Object.prototype.hasOwnProperty.call(parsedValue, 'useSchemaEditor')) {
        parsedValue.useSchemaEditor = true;
        return {
          ...segment,
          value: JSON.stringify(parsedValue),
        };
      }
      return segment;
    } catch (error) {
      console.error('Error parsing or updating value segment:', error);
      return segment;
    }
  });

  return updatedValue;
};

export const MixedInputEditor: React.FC<MixedInputEditorProps> = ({
  initialValue,
  onChange,
  supportedTypes,
  isRequestApiConnectionTrigger,
  label,
  readonly,
  useStaticInputs,
}) => {
  const [isSchemaEditor, setIsSchemaEditor] = useState<boolean>(() => {
    const storedToggleValue = localStorage.getItem('toggle');
    const hasSchemaEditor = checkIsSchemaEditor(initialValue);

    if (storedToggleValue === null) {
      return hasSchemaEditor;
    }
    const stateFromStorage = storedToggleValue === 'true';
    return stateFromStorage && hasSchemaEditor;
  });

  useEffect(() => {
    // Check if we need to update the state or localStorage
    if (isSchemaEditor) {
      const updatedValue = addUseSchemaEditor(initialValue);
      // Only call onChange if there's a real update
      if (JSON.stringify(updatedValue) !== JSON.stringify(initialValue)) {
        onChange({ value: updatedValue });
      }
      // Update localStorage only if not already set
      if (localStorage.getItem('toggle') !== 'true') {
        localStorage.setItem('toggle', 'true');
      }
    } else if (localStorage.getItem('toggle') === 'true') {
      localStorage.setItem('toggle', 'false');
    }
  }, [isSchemaEditor, initialValue, onChange]);

  const handleToggleChange = (ev: React.MouseEvent<HTMLElement>, checked?: boolean) => {
    setIsSchemaEditor(checked ?? false);
  };

  return (
    <div>
      <Toggle label="Use Schema Editor" checked={isSchemaEditor} onChange={handleToggleChange} disabled={readonly} />
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
