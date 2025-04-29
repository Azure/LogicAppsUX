import { useOperationVisuals } from '../../../../core/state/operation/operationSelector';
import { useNodeDisplayName } from '../../../../core/state/workflow/workflowSelectors';
import { TransitionsActionStatuses } from './transitionsActionStatuses';
import { TransitionsTrafficLights } from './transitionTrafficLights';
import { Button, Divider, Tooltip } from '@fluentui/react-components';
import { useBoolean } from '@fluentui/react-hooks';
import {
  bundleIcon,
  ChevronDown24Filled,
  ChevronDown24Regular,
  ChevronRight24Filled,
  ChevronRight24Regular,
  Delete24Filled,
  Delete24Regular,
} from '@fluentui/react-icons';
import { useCallback, useEffect, useMemo, type MouseEvent } from 'react';
import { useIntl } from 'react-intl';
import { format } from 'util';
import type { LogicAppsV2 } from '@microsoft/logic-apps-shared';
import { TransitionProperties } from './transitionProperties';
import { useOperationPanelSelectedTransitionTargetId } from '../../../../core/state/panel/panelSelectors';

const DeleteIcon = bundleIcon(Delete24Filled, Delete24Regular);
const ChevronDownIcon = bundleIcon(ChevronDown24Filled, ChevronDown24Regular);
const ChevronRightIcon = bundleIcon(ChevronRight24Filled, ChevronRight24Regular);

export type onChangeHandler = (status: string, checked?: boolean) => void;

interface LabelProps {
  label: string;
  status: string;
}

export interface TransitionsActionDetailsProps {
  collapsible?: boolean;
  expanded: boolean;
  sourceId: string;
  targetId: string;
  disableDelete: boolean;
  disableStatusChange: boolean;
  readOnly: boolean;
  transition: LogicAppsV2.Transition;
  visible?: boolean;
  onDelete?(): void;
  onRenderLabel?(props: LabelProps): JSX.Element | null;
  onStatusChange?: onChangeHandler;
}

export const TransitionsActionDetails = ({
  sourceId,
  targetId,
  collapsible = true,
  disableDelete,
  disableStatusChange,
  readOnly,
  transition,
  onDelete,
  onStatusChange,
}: TransitionsActionDetailsProps) => {
  const [expanded, setExpanded] = useBoolean(false);

  const intl = useIntl();

  const expandAriaLabel = intl.formatMessage({
    defaultMessage: 'Expand',
    id: 'iU1OJh',
    description: 'An accessible label for expand toggle icon',
  });
  const collapseAriaLabel = intl.formatMessage({
    defaultMessage: 'Collapse',
    id: 'PQOiAc',
    description: 'An accessible label for collapse toggle icon',
  });

  const title = useNodeDisplayName(targetId);
  const { iconUri } = useOperationVisuals(targetId);

  const defaultSelectedTransitionTargetId = useOperationPanelSelectedTransitionTargetId();
  useEffect(() => {
    if (defaultSelectedTransitionTargetId === targetId) {
      setExpanded.setTrue();
    } else {
      setExpanded.setFalse();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultSelectedTransitionTargetId]);

  return (
    <>
      <div className="msla-run-after-edge-header">
        <Button
          className="msla-run-after-edge-header-contents"
          appearance="subtle"
          onClick={setExpanded.toggle}
          icon={expanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
          aria-label={format(expanded ? `${collapseAriaLabel} ${title}` : `${expandAriaLabel} ${title}`, title)}
        >
          <img alt="" className="msla-run-after-node-image" role="presentation" src={iconUri} />
          <span className="msla-run-after-node-title">{title}</span>
          <TransitionsTrafficLights statuses={transition.when} />
        </Button>
        <DeleteButton disabled={disableDelete} visible={!readOnly} onDelete={onDelete} />
      </div>

      {(!collapsible || expanded) && (
        <>
          <TransitionsActionStatuses
            isReadOnly={readOnly || disableStatusChange}
            statuses={transition.when}
            onStatusChange={onStatusChange}
          />
          <div style={{ margin: '4px 0px 16px 39px' }}>
            <TransitionProperties nodeId={sourceId} sourceId={sourceId} targetId={targetId} readOnly={readOnly} />
          </div>
        </>
      )}
      {expanded && <Divider className="msla-run-after-divider" />}
    </>
  );
};

interface DeleteButtonProps extends Pick<TransitionsActionDetailsProps, 'onDelete'> {
  visible?: boolean;
  disabled?: boolean;
}

const DeleteButton = ({ visible, disabled, onDelete }: DeleteButtonProps): JSX.Element | null => {
  const intl = useIntl();

  const MENU_DELETE = intl.formatMessage({
    defaultMessage: 'Delete',
    id: 's7nGyC',
    description: 'Delete Button',
  });

  const preventDeleteText = intl.formatMessage({
    defaultMessage: 'Actions must have one or more run after configurations',
    id: 'hCrg+6',
    description: 'Cannot delete the last run after edge',
  });

  const handleDelete = useCallback(
    (e: MouseEvent<unknown>) => {
      e.preventDefault();
      e.stopPropagation();
      onDelete?.();
    },
    [onDelete]
  );

  const content = useMemo(
    () => (
      <Button
        appearance="subtle"
        icon={<DeleteIcon />}
        aria-label={MENU_DELETE}
        onClick={handleDelete}
        disabled={disabled}
        style={{ color: 'var(--colorBrandForeground1)' }}
      />
    ),
    [MENU_DELETE, disabled, handleDelete]
  );

  if (!visible) {
    return null;
  }

  return disabled ? (
    <Tooltip content={preventDeleteText} relationship={'description'}>
      {content}
    </Tooltip>
  ) : (
    content
  );
};
