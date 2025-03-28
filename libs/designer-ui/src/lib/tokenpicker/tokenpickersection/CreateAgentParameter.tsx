import { Button, Dropdown, Input, Label, Textarea, useId, Option } from '@fluentui/react-components';
import type { ParameterInfo } from '@microsoft/logic-apps-shared';
import { useMemo, useState } from 'react';
import { useIntl } from 'react-intl';

const options = ['Boolean', 'Integer', 'Float', 'String', 'Object', 'Array'];

interface CreateAgentParameterProps {
  createAgentParameter?: (name: string, type: string, description: string) => void;
  cancelCreateAgentParameter: () => void;
  defaultAgentParamType?: string;
  defaultAgentParamName: string;
}

export const CreateAgentParameter = ({
  defaultAgentParamType,
  defaultAgentParamName,
  createAgentParameter,
  cancelCreateAgentParameter,
}: CreateAgentParameterProps) => {
  const intl = useIntl();

  const nameId = useId('name');
  const typeId = useId('type');
  const descriptionId = useId('description');
  const [name, setName] = useState(defaultAgentParamName);
  const initialType = useMemo(
    // Type needs to be lowercased
    () => (options.includes(defaultAgentParamType ?? '') ? (defaultAgentParamType as string) : 'string').toLowerCase(),
    [defaultAgentParamType]
  );
  const [type, setType] = useState(initialType);
  const [description, setDescription] = useState('');

  const labels = {
    title: intl.formatMessage({
      defaultMessage: 'Create new agent parameter',
      id: 'uhxyi+',
      description: 'Create new parameter',
    }),
    createButton: intl.formatMessage({
      defaultMessage: 'Create',
      id: 'M4MGQN',
      description: 'Create button label',
    }),
    cancelButton: intl.formatMessage({
      defaultMessage: 'Cancel',
      id: '0GT0SI',
      description: 'Cancel button label',
    }),
    name: intl.formatMessage({
      defaultMessage: 'Name',
      id: 'gOkIvb',
      description: 'Name label',
    }),
    type: intl.formatMessage({
      defaultMessage: 'Type',
      id: 'qBKOEO',
      description: 'Type label',
    }),
    description: intl.formatMessage({
      defaultMessage: 'Description',
      id: 'QMyMOI',
      description: 'Description label',
    }),
  };

  const placeholders = {
    name: intl.formatMessage({
      defaultMessage: 'Name this parameter',
      id: 'AmSRsf',
      description: 'Name input placeholder',
    }),
    type: intl.formatMessage({
      defaultMessage: 'Select Type',
      id: '+Oshid',
      description: 'Type dropdown placeholder',
    }),
    description: intl.formatMessage({
      defaultMessage: 'Describe This Parameter',
      id: 'DwLFBV',
      description: 'Description textarea placeholder',
    }),
  };

  const isCreateDisabled = useMemo(() => !name.trim() || !type.trim() || !description.trim(), [description, name, type]);

  const handleCreateClick = () => {
    createAgentParameter?.(name, type, description);
  };

  return (
    <div className="msla-tokenpicker-agentparameter-create-container">
      <div className="msla-tokenpicker-agentparameter-create-title">{labels.title}</div>

      <div className="msla-tokenpicker-agentparameter-create-inputs">
        <div className="msla-tokenpicker-agentparameter-create-input">
          <Label htmlFor={nameId} required>
            {labels.name}
          </Label>
          <Input
            id={nameId}
            className="msla-agent-parameter-input"
            placeholder={placeholders.name}
            value={name}
            onChange={(_e, data) => setName(data.value)}
          />
        </div>

        <div className="msla-tokenpicker-agentparameter-create-input">
          <Label htmlFor={typeId} required>
            {labels.type}
          </Label>
          <Dropdown
            id={typeId}
            placeholder={placeholders.type}
            className="msla-agent-parameter-input"
            value={type}
            onOptionSelect={(_, data) => setType((data.optionValue ?? '').toLowerCase())}
          >
            {options.map((option) => (
              <Option key={option} value={option}>
                {option}
              </Option>
            ))}
          </Dropdown>
        </div>

        <div className="msla-tokenpicker-agentparameter-create-input">
          <Label htmlFor={descriptionId} required>
            {labels.description}
          </Label>
          <Textarea
            id={descriptionId}
            className="msla-agent-parameter-input"
            placeholder={placeholders.description}
            rows={4}
            resize="vertical"
            value={description}
            onChange={(_e, data) => setDescription(data.value)}
          />
        </div>
      </div>

      <div className="msla-tokenpicker-agentparameter-create-buttons">
        <Button appearance="primary" onClick={handleCreateClick} style={{ marginRight: '8px' }} disabled={isCreateDisabled}>
          {labels.createButton}
        </Button>
        <Button appearance="secondary" onClick={cancelCreateAgentParameter}>
          {labels.cancelButton}
        </Button>
      </div>
    </div>
  );
};

export const generateDefaultAgentParamName = (parameter: ParameterInfo): string => {
  const { placeholder, label } = parameter;

  if (!placeholder) {
    return label;
  }

  const words = placeholder.trim().split(/\s+/);

  // This is just a heuristic to determine if the placeholder is a sentence or a phrase
  if (words.length < 4 && /^enter|choose/i.test(words[0])) {
    words.shift();
  } else {
    return label;
  }

  return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
};
