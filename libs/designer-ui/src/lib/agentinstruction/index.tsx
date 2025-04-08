import { Link, MessageBar, MessageBarBody, MessageBarTitle, Text } from '@fluentui/react-components';
import type { BaseEditorProps, CastHandler, ChangeHandler, ChangeState, GetTokenPickerHandler } from '../editor/base';
import { useIntl } from 'react-intl';
import { LinkSquare12Regular, LinkSquare12Filled, bundleIcon } from '@fluentui/react-icons';
import { StringEditor } from './../editor/string';
import { useMemo, useState } from 'react';
import { parseAgentInstruction, AGENT_INSTRUCTION_TYPES, serializeAgentInstructions } from './util';
import { css } from '@fluentui/utilities';
import { ArrayEditor, ArrayType } from '../arrayeditor';
import { Label } from '../label';

const NavigateIcon = bundleIcon(LinkSquare12Regular, LinkSquare12Filled);

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
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const { systemMessage, userMessage } = useMemo(() => {
    return parseAgentInstruction(initialValue, setErrorMessage);
  }, [initialValue]);
  const description = intl.formatMessage({
    defaultMessage:
      'Add instructions so the agent understands its role and tasks. It can be helpful to include information about workflow structure, restrictions, tools, and interaction in certain scenarios.',
    description: 'Agent Instruction Editor description',
    id: 'gzwIqh',
  });
  const descriptionLink = intl.formatMessage({
    defaultMessage: 'Tips for writing agent instructions',
    description: 'Agent Instruction Editor description link',
    id: 'cC7hlj',
  });
  const systemPlaceholder = intl.formatMessage({
    defaultMessage: 'Enter instructions for the agent',
    description: 'Agent System placeholder',
    id: '1MXRVZ',
  });
  const userPlaceholder = intl.formatMessage({
    defaultMessage: 'Enter instructions for the user',
    description: 'Agent User placeholder',
    id: 'Jzbnc/',
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
      <Text style={{ fontSize: 12, fontStyle: 'italic' }}>{description} </Text>
      <Link
        href="https://learn.microsoft.com/en-us/microsoft-365-copilot/extensibility/declarative-agent-instructions"
        target="_blank"
        style={{ fontSize: 12, fontStyle: 'italic' }}
      >
        {descriptionLink}
        <NavigateIcon style={{ position: 'relative', top: '2px' }} />
      </Link>
      <div className="msla-agent-instruction-editors">
        <Label text={systemPromptLabel} isRequiredField />
        <StringEditor
          {...props}
          className={css(className, 'msla-agent-instruction-system-editor editor-custom')}
          placeholder={systemPlaceholder}
          initialValue={systemMessage}
          editorBlur={(newState: ChangeState) => handleValueChange(newState, AGENT_INSTRUCTION_TYPES.SYSTEM)}
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
        <MessageBar key={'warning'} intent={'warning'} className="msla-agent-instruction-editor-warning">
          <MessageBarBody>
            <MessageBarTitle>{errorMessage}</MessageBarTitle>
            {warningInstructionBody}
          </MessageBarBody>
        </MessageBar>
      ) : null}
    </div>
  );
};
