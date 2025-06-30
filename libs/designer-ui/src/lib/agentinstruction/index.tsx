import { Link, MessageBar, MessageBarBody, MessageBarTitle, Text, mergeClasses } from '@fluentui/react-components';
import type { BaseEditorProps, CastHandler, ChangeHandler, ChangeState, GetTokenPickerHandler } from '../editor/base';
import { useIntl } from 'react-intl';
import { bundleIcon, Open12Regular, Open12Filled } from '@fluentui/react-icons';
import { StringEditor } from './../editor/string';
import { useMemo, useState } from 'react';
import { parseAgentInstruction, AGENT_INSTRUCTION_TYPES, serializeAgentInstructions } from './util';
import { css } from '@fluentui/utilities';
import { ArrayEditor, ArrayType } from '../arrayeditor';
import { Label } from '../label';
import { useAgentInstructionStyles } from './agentinstruction.styles';
import constants from '../constants';

export const NavigateIcon = bundleIcon(Open12Regular, Open12Filled);

interface AgentInstructionEditorProps extends BaseEditorProps {
  serializeValue?: ChangeHandler;
  onCastParameter: CastHandler;
}

export const AgentInstructionEditor = ({
  initialValue,
  className,
  onCastParameter,
  serializeValue,
  ...props
}: AgentInstructionEditorProps): JSX.Element => {
  const intl = useIntl();
  const styles = useAgentInstructionStyles();
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const { systemMessage, userMessage } = useMemo(() => {
    return parseAgentInstruction(initialValue, setErrorMessage);
  }, [initialValue]);
  const description = intl.formatMessage({
    defaultMessage:
      'Add instructions so the agent understands its role and tasks. Include helpful information about workflow structure, restrictions, tools, and interactions in specific scenarios.',
    description: 'Description for agent instruction editor',
    id: 'hRLAFg',
  });
  const descriptionLink = intl.formatMessage({
    defaultMessage: 'Tips for writing agent instructions',
    description: 'Description link for agent instruction editor',
    id: 'Vp5rnF',
  });
  const systemPlaceholder = intl.formatMessage({
    defaultMessage: 'Enter the instructions for the agent.',
    description: 'Agent system placeholder',
    id: 'dlLxEo',
  });
  const userPlaceholder = intl.formatMessage({
    defaultMessage: 'Enter instructions for the user',
    description: 'Agent user placeholder',
    id: 'SPaCir',
  });
  const userItemLabel = intl.formatMessage({
    defaultMessage: 'User Instructions',
    description: 'User instructions label',
    id: 'Ly65mM',
  });

  const systemPromptLabel = intl.formatMessage({
    defaultMessage: 'System Instructions',
    description: 'System instructions label',
    id: 'YT3ZMc',
  });
  const warningInstructionBody = intl.formatMessage({
    defaultMessage: 'This could mean that the instruction schema is set up incorrectly.',
    id: 'hzJxEr',
    description: 'Warning body for when unable to parse schema',
  });

  const handleValueChange = (payload: ChangeState, agentLevel: AGENT_INSTRUCTION_TYPES) => {
    const serializedValue = serializeAgentInstructions(payload, agentLevel, systemMessage, userMessage);
    setErrorMessage(undefined);
    serializeValue?.({ value: serializedValue });
  };

  return (
    <div className="msla-agent-instruction-editor-container">
      <Text style={{ fontSize: 12 }}>{description} </Text>
      <Link href="https://aka.ms/LogicApps/Agents" target="_blank" style={{ fontSize: 12, fontStyle: 'italic' }}>
        {descriptionLink}
        <NavigateIcon style={{ position: 'relative', top: '2px', left: '2px' }} />
      </Link>
      <div className={mergeClasses(styles.editors)}>
        <Label text={systemPromptLabel} isRequiredField />
        <StringEditor
          {...props}
          className={mergeClasses(styles.systemEditor, css(className, 'msla-agent-instruction-system-editor editor-custom'))}
          placeholder={systemPlaceholder}
          initialValue={systemMessage}
          editorBlur={(newState: ChangeState) => handleValueChange(newState, AGENT_INSTRUCTION_TYPES.SYSTEM)}
          valueType={constants.SWAGGER.TYPE.STRING}
        />
        <Label text={userItemLabel} />
        <ArrayEditor
          {...props}
          isRequired={false}
          label={userItemLabel}
          placeholder={userPlaceholder}
          itemSchema={{ key: 'userMessage', type: 'string' }}
          arrayType={ArrayType.SIMPLE}
          castParameter={onCastParameter}
          initialValue={userMessage}
          getTokenPicker={props.getTokenPicker as GetTokenPickerHandler}
          onChange={(newState: ChangeState) => handleValueChange(newState, AGENT_INSTRUCTION_TYPES.USER)}
        />
      </div>
      {errorMessage ? (
        <MessageBar key={'warning'} intent={'warning'} className={styles.editorWarning}>
          <MessageBarBody>
            <MessageBarTitle>{errorMessage}</MessageBarTitle>
            {warningInstructionBody}
          </MessageBarBody>
        </MessageBar>
      ) : null}
    </div>
  );
};
