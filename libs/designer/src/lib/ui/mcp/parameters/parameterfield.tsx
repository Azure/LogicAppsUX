import { Label, Button, mergeClasses, RadioGroup, Radio } from '@fluentui/react-components';
import { Dismiss16Regular } from '@fluentui/react-icons';
import { useMemo } from 'react';
import { useEditOperationStyles } from './styles';
import type { ParameterInfo, ValueSegment } from '@microsoft/logic-apps-shared';
import { useIntl } from 'react-intl';
import { ParameterEditor } from './ParameterEditor';
import constants from '../../../common/constants';

export const ParameterField = ({
  operationId,
  groupId,
  parameter,
  isConditional,
  onParameterVisibilityUpdate,
  handleParameterValueChange,
  handleRemoveConditionalParameter,
}: {
  operationId: string;
  groupId: string;
  parameter: ParameterInfo;
  isConditional?: boolean;
  onParameterVisibilityUpdate: () => void;
  handleParameterValueChange: (parameterId: string, newValue: ValueSegment[]) => void;
  handleRemoveConditionalParameter: (parameterId: string) => void;
}) => {
  const intl = useIntl();
  const styles = useEditOperationStyles();

  const removeParamText = intl.formatMessage({
    id: '5E66mK',
    defaultMessage: 'Remove parameter',
    description: 'Tooltip for remove parameter button',
  });

  const isLargeParameter = useMemo(() => {
    const editor = parameter.editor?.toLowerCase();
    return (
      editor === constants.EDITOR.ARRAY ||
      editor === constants.EDITOR.DICTIONARY ||
      editor === constants.EDITOR.HTML ||
      editor === constants.EDITOR.TABLE
    );
  }, [parameter.editor]);

  return (
    <div className={styles.parameterField}>
      <Label className={styles.parameterLabel} required={parameter.required} title={parameter.label}>
        {parameter.label}
      </Label>
      <RadioGroup>
        <Radio value={'model'} key={'model'} label="Model" />
      </RadioGroup>
      <div className={mergeClasses(styles.parameterValueSection, isLargeParameter && styles.largeParameterSection)}>
        <ParameterEditor
          operationId={operationId}
          groupId={groupId}
          parameter={parameter}
          onParameterVisibilityUpdate={onParameterVisibilityUpdate}
          handleParameterValueChange={handleParameterValueChange}
        />
        {isConditional && (
          <Button
            appearance="subtle"
            size="small"
            icon={<Dismiss16Regular />}
            onClick={() => handleRemoveConditionalParameter(parameter.id)}
            title={removeParamText}
            className={styles.removeParameterButton}
          />
        )}
      </div>
    </div>
  );
};
