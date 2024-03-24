import type {
  IConnectionParameterEditorOptions,
  IConnectionParameterEditorProps,
  IConnectionParameterEditorService,
  IConnectionParameterInfo,
} from '@microsoft/logic-apps-shared';
import { ConnectionParameterRow, UniversalConnectionParameter } from '@microsoft/logic-apps-designer';
import { useEffect, useState } from 'react';

export class CustomConnectionParameterEditorService implements IConnectionParameterEditorService {
  public areCustomEditorsEnabled = false;

  public getConnectionParameterEditor({
    connectorId,
    parameterKey,
  }: IConnectionParameterInfo): IConnectionParameterEditorOptions | undefined {
    if (!this.areCustomEditorsEnabled) {
      return undefined;
    }

    if (connectorId === '/providers/Microsoft.PowerApps/apis/shared_uiflow' && parameterKey === 'targetId') {
      return {
        EditorComponent: TargetPicker,
      };
    }

    return undefined;
  }
}

// string parameter to dropdown options with manual value.
const TargetPicker = (props: IConnectionParameterEditorProps) => {
  type RemoteOption = {
    text: string;
    value: any;
  };
  const [remoteOptions, setRemoteOptions] = useState<RemoteOption[]>([]);
  useEffect(() => {
    const timeout = setTimeout(() => {
      setRemoteOptions([
        {
          text: 'My Target 1',
          value: '07c82fd2-878a-40a9-8a80-085e37dfe56c',
        },

        {
          text: 'My Target 2',
          value: '7f135087-6f6d-4d95-99c3-91de3a62d156',
        },
      ]);
    }, 2_000);

    return () => clearTimeout(timeout);
  }, []);

  const customAllowedValue =
    props.value && !remoteOptions.some((o) => o.value === props.value)
      ? {
          text: `Custom value (${props.value})`,
          value: props.value,
        }
      : {
          text: `Custom value`,
          value: '',
        };

  const parameter = {
    ...props.parameter,
    uiDefinition: {
      ...props.parameter.uiDefinition,
      constraints: {
        ...props.parameter.uiDefinition?.constraints,
      },
    },
  };

  let isLoading = true;
  if (remoteOptions.length !== 0) {
    isLoading = false;
    parameter.uiDefinition.constraints.required = 'true';
    parameter.uiDefinition.constraints.allowedValues = [...remoteOptions, customAllowedValue];
  }

  const setValue = (value: any) => {
    let customValue = value;
    if (value === customAllowedValue.value) {
      customValue = prompt('Enter a custom value', value);
    }
    props.setValue(customValue);
  };

  return (
    <>
      <UniversalConnectionParameter {...props} isLoading={isLoading} parameter={parameter} setValue={setValue} />
      <ConnectionParameterRow parameterKey={'targetId-2'} displayName={'Target ID'} tooltip="enter a value">
        <input
          value={props.value}
          onChange={(e) => setValue(e.target.value)}
          style={{
            width: ' 100%',
          }}
        />
      </ConnectionParameterRow>
    </>
  );
};
