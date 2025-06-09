import { TrafficLightDot } from '../card/images/dynamicsvgs/trafficlightsvgs';
import type { EventHandler } from '../eventhandler';
import { WorkflowparameterField } from './workflowparametersField';
import { useWorkflowParameterStyles } from './styles';
import { Badge, Button, Tooltip } from '@fluentui/react-components';
import {
  bundleIcon,
  ChevronRight24Regular,
  ChevronRight24Filled,
  ChevronDown24Regular,
  ChevronDown24Filled,
  Delete24Filled,
  Delete24Regular,
} from '@fluentui/react-icons';
import { RUN_AFTER_COLORS } from '@microsoft/logic-apps-shared';
import { useState } from 'react';
import { useIntl } from 'react-intl';

const ExpandIcon = bundleIcon(ChevronRight24Filled, ChevronRight24Regular);
const CollapseIcon = bundleIcon(ChevronDown24Filled, ChevronDown24Regular);
const DeleteIcon = bundleIcon(Delete24Filled, Delete24Regular);

export interface WorkflowParameterUpdateEvent {
  id: string;
  newDefinition: WorkflowParameterDefinition;
  useLegacy?: boolean;
}

export interface WorkflowParameterDeleteEvent {
  id: string;
}

export type WorkflowParameterUpdateHandler = EventHandler<WorkflowParameterUpdateEvent>;
export type WorkflowParameterDeleteHandler = EventHandler<WorkflowParameterDeleteEvent>;
export type RegisterLanguageHandler = () => void;

export interface WorkflowParameterDefinition {
  value?: string;
  id: string;
  isEditable?: boolean;
  name?: string;
  type: string;
  defaultValue?: string;
  required?: boolean;
  description?: string;
}

export interface WorkflowParameterProps {
  definition: WorkflowParameterDefinition;
  isReadOnly?: boolean;
  useLegacy?: boolean;
  validationErrors?: Record<string, string | undefined>;
  isInverted?: boolean;
  onChange?: WorkflowParameterUpdateHandler;
  onDelete?: WorkflowParameterDeleteHandler;
  onRegisterLanguageProvider?: RegisterLanguageHandler;
  disableDelete?: boolean;
  isNewlyAdded?: boolean;
}

export function WorkflowParameter({
  definition,
  isReadOnly,
  useLegacy,
  isInverted,
  disableDelete,
  isNewlyAdded,
  ...props
}: WorkflowParameterProps): JSX.Element {
  const [expanded, setExpanded] = useState(isNewlyAdded ?? !!definition.isEditable);
  const [name, setName] = useState(definition.name);
  const styles = useWorkflowParameterStyles();

  const intl = useIntl();
  const themeName = isInverted ? 'dark' : 'light';

  const handleToggleExpand = (): void => {
    setExpanded(!expanded);
  };

  const headingTitle = intl.formatMessage({
    defaultMessage: 'New parameter',
    id: 'ss5JPH',
    description: 'Heading Title for a Parameter Without Name',
  });

  const deleteButtonTitle = intl.formatMessage({
    defaultMessage: 'Delete parameter',
    id: 'qsL/fE',
    description: 'Delete Button Tooltip Text',
  });

  const deleteButtonDisabledTitle = intl.formatMessage({
    defaultMessage: 'Cannot delete the last parameter',
    id: 'tEqgJQ',
    description: 'Delete button disabled tooltip text',
  });

  // Get the display name for the parameter type
  const getTypeDisplayName = (type: string): string => {
    switch (type?.toLowerCase()) {
      case 'string':
        return 'String';
      case 'int':
      case 'integer':
        return 'Integer';
      case 'bool':
      case 'boolean':
        return 'Boolean';
      case 'array':
        return 'Array';
      case 'object':
        return 'Object';
      case 'float':
      case 'number':
        return 'Float';
      default:
        return type || '';
    }
  };

  const typeDisplayName = getTypeDisplayName(definition.type);

  const handleDelete = () => {
    if (props.onDelete) {
      props.onDelete({ id: definition.id });
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.heading}>
        <Button
          id={definition.id}
          data-automation-id={`${name}-parameter-heading-button`}
          data-testid={`${name}-parameter-heading-button`}
          appearance="subtle"
          className={styles.headingButton}
          onClick={handleToggleExpand}
          icon={expanded ? <CollapseIcon /> : <ExpandIcon />}
          aria-expanded={expanded}
          style={{ justifyContent: 'flex-start', width: '90%' }}
        >
          {name ? name : headingTitle}
          {Object.values(props.validationErrors ?? {}).filter((x) => !!x).length > 0 ? (
            <span className={styles.errorDot}>
              <TrafficLightDot fill={RUN_AFTER_COLORS[themeName]['FAILED']} />
            </span>
          ) : null}
        </Button>
        {!isReadOnly && (
          <>
            {typeDisplayName && (
              <div
                className={styles.typeBadge}
                data-testid="parameter-type-badge"
                aria-label={`Parameter type: ${typeDisplayName}`}
                role="status"
              >
                <Badge appearance="filled" size="medium" color="brand">
                  {typeDisplayName}
                </Badge>
              </div>
            )}
            <div className={styles.editOrDeleteButton}>
              <Tooltip relationship="label" content={disableDelete ? deleteButtonDisabledTitle : deleteButtonTitle}>
                <Button
                  appearance="subtle"
                  aria-label={deleteButtonTitle}
                  onClick={handleDelete}
                  icon={<DeleteIcon />}
                  disabled={disableDelete || isReadOnly}
                  style={{ color: 'var(--colorBrandForeground1)' }}
                />
              </Tooltip>
            </div>
          </>
        )}
      </div>
      {expanded ? (
        <div className={styles.content}>
          <WorkflowparameterField
            name={name}
            definition={definition}
            validationErrors={props.validationErrors}
            setName={setName}
            onChange={props.onChange}
            isEditable={true}
            isReadOnly={isReadOnly}
            useLegacy={useLegacy}
          />
        </div>
      ) : null}
    </div>
  );
}
