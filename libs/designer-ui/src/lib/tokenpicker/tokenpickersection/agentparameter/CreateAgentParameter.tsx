import { Button, Dropdown, Input, Label, Textarea, useId, Option } from '@fluentui/react-components';
import { capitalizeFirstLetter, type ParameterInfo } from '@microsoft/logic-apps-shared';
import type { NodeKey } from 'lexical';
import { useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';

const options = ['boolean', 'integer', 'float', 'string', 'object', 'array'];

interface CreateAgentParameterProps {
  createAgentParameter?: (name: string, type: string, description: string) => void;
  cancelCreateAgentParameter: () => void;
  nodeToBeUpdated: NodeKey | null;
  defaultName: string;
  defaultType?: string;
  defaultDescription?: string;
}

export const CreateAgentParameter = ({
  defaultName,
  defaultType,
  defaultDescription,
  nodeToBeUpdated,
  createAgentParameter,
  cancelCreateAgentParameter,
}: CreateAgentParameterProps) => {
  const intl = useIntl();

  const nameId = useId('name');
  const typeId = useId('type');
  const descriptionId = useId('description');
  const [name, setName] = useState(defaultName);
  const initialType = useMemo(() => {
    return options.includes(defaultType ?? '') ? (defaultType as string) : 'string';
  }, [defaultType]);
  const [type, setType] = useState(initialType);
  const [description, setDescription] = useState(defaultDescription ?? '');

  // Because Opening the tokenpicker and populating the agentParameter are asynchronous
  // we need to update the values when the default values are updated
  useEffect(() => {
    setName(defaultName);
    setDescription(defaultDescription ?? '');
    setType(options.includes(defaultType ?? '') ? (defaultType as string) : 'string');
  }, [defaultDescription, defaultType, defaultName]);

  const labels = {
    title: intl.formatMessage({ defaultMessage: 'Create new agent parameter', id: 'uhxyi+', description: 'Create new parameter' }),
    editTitle: intl.formatMessage({ defaultMessage: 'Edit agent parameter', id: 'nwTyEd', description: 'Edit parameter' }),
    updateButton: intl.formatMessage({ defaultMessage: 'Update', id: 'Xpo7B8', description: 'Update button label' }),
    createButton: intl.formatMessage({ defaultMessage: 'Create', id: 'M4MGQN', description: 'Create button label' }),
    cancelButton: intl.formatMessage({ defaultMessage: 'Cancel', id: '0GT0SI', description: 'Cancel button label' }),
    name: intl.formatMessage({ defaultMessage: 'Name', id: 'gOkIvb', description: 'Name label' }),
    type: intl.formatMessage({ defaultMessage: 'Type', id: 'qBKOEO', description: 'Type label' }),
    description: intl.formatMessage({ defaultMessage: 'Description', id: 'QMyMOI', description: 'Description label' }),
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
      <div className="msla-tokenpicker-agentparameter-create-title">{nodeToBeUpdated ? labels.editTitle : labels.title}</div>

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
            disabled={!!nodeToBeUpdated}
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
                {capitalizeFirstLetter(option)}
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
          {nodeToBeUpdated ? labels.updateButton : labels.createButton}
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

  return words.map((word) => capitalizeFirstLetter(word)).join(' ');
};

export const generateDefaultAgentParamDescription = (parameter: ParameterInfo): string => {
  const { placeholder, label } = parameter;
  if (!placeholder) {
    return label;
  }
  const words = placeholder.trim().split(/\s+/);
  if (words[0]) {
    words.shift();
  } else {
    return label;
  }

  return capitalizeFirstLetter(words.join(' '));
};
