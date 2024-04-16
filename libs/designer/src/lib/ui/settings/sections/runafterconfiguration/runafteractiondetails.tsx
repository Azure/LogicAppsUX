import { useOperationVisuals } from '../../../../core/state/operation/operationSelector';
import { useNodeDisplayName } from '../../../../core/state/workflow/workflowSelectors';
import { RunAfterActionStatuses } from './runafteractionstatuses';
import { RunAfterTrafficLights } from './runaftertrafficlights';
import { Button, Divider } from '@fluentui/react-components';
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
import type { MouseEvent } from 'react';
import { useIntl } from 'react-intl';
import { format } from 'util';

const DeleteIcon = bundleIcon(Delete24Filled, Delete24Regular);
const ChevronDownIcon = bundleIcon(ChevronDown24Filled, ChevronDown24Regular);
const ChevronRightIcon = bundleIcon(ChevronRight24Filled, ChevronRight24Regular);

export type onChangeHandler = (status: string, checked?: boolean) => void;

interface LabelProps {
  label: string;
  status: string;
}

export interface RunAfterActionDetailsProps {
  collapsible?: boolean;
  expanded: boolean;
  id: string;
  isDeleteVisible: boolean;
  readOnly: boolean;
  statuses: string[];
  visible?: boolean;
  onDelete?(): void;
  onRenderLabel?(props: LabelProps): JSX.Element | null;
  onStatusChange?: onChangeHandler;
}

export const RunAfterActionDetails = ({
  id,
  collapsible = true,
  isDeleteVisible,
  readOnly,
  statuses,
  onDelete,
  onStatusChange,
}: RunAfterActionDetailsProps) => {
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

  const title = useNodeDisplayName(id);
  const { iconUri } = useOperationVisuals(id);

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
          <RunAfterTrafficLights statuses={statuses} />
          <DeleteButton visible={isDeleteVisible && !readOnly} onDelete={onDelete} />
        </Button>
      </div>

      {(!collapsible || expanded) && <RunAfterActionStatuses isReadOnly={readOnly} statuses={statuses} onStatusChange={onStatusChange} />}
      {expanded && <Divider className="msla-run-after-divider" />}
    </>
  );
};

interface DeleteButtonProps extends Pick<RunAfterActionDetailsProps, 'onDelete'> {
  visible: boolean;
}

const DeleteButton = ({ visible, onDelete }: DeleteButtonProps): JSX.Element | null => {
  const intl = useIntl();

  const MENU_DELETE = intl.formatMessage({
    defaultMessage: 'Delete',
    id: 's7nGyC',
    description: 'Delete Button',
  });
  function handleDelete(e: MouseEvent<unknown>): void {
    e.preventDefault();
    e.stopPropagation();
    onDelete?.();
  }

  if (!visible) {
    return null;
  }

  return (
    <Button
      appearance="subtle"
      icon={<DeleteIcon />}
      aria-label={MENU_DELETE}
      onClick={handleDelete}
      style={{ color: 'var(--colorBrandForeground1)' }}
    />
  );
};
