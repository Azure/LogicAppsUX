import constants from '../../../../common/constants';
import { useOperationInfo, useIconUri } from '../../../../core/state/selectors/actionMetadataSelector';
import { RunAfterActionStatuses } from './runafteractionstatuses';
import { RunAfterTrafficLights } from './runaftertrafficlights';
import { useBoolean } from '@fluentui/react-hooks';
import type { IButtonStyles } from '@fluentui/react/lib/Button';
import { IconButton } from '@fluentui/react/lib/Button';
import type { IIconProps } from '@fluentui/react/lib/Icon';
import { Icon } from '@fluentui/react/lib/Icon';
import type { ISeparatorStyles } from '@fluentui/react/lib/Separator';
import { Separator } from '@fluentui/react/lib/Separator';
import { Failed, Skipped, Succeeded, TimedOut } from '@microsoft/designer-ui';
import type { MouseEvent } from 'react';
import { useIntl } from 'react-intl';
import { format } from 'util';

export enum Status {
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED',
  TIMEDOUT = 'TIMEDOUT',
}

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
  title: string;
  visible?: boolean;
  onDelete?(): void;
  onRenderLabel?(props: LabelProps): JSX.Element | null;
  onStatusChange?: onChangeHandler;
}

const deleteIconProp: IIconProps = {
  iconName: 'Delete',
};

const deleteIconStyles: IButtonStyles = {
  icon: {
    color: '#0078d4',
    fontSize: 16,
  },
};

const separatorStyles: Partial<ISeparatorStyles> = {
  root: {
    color: '#d4d4d4',
  },
};

export const RunAfterActionDetails = ({
  collapsible = true,
  isDeleteVisible,
  readOnly,
  statuses,
  title,
  onDelete,
  onStatusChange,
  onRenderLabel,
}: RunAfterActionDetailsProps) => {
  const [expanded, setExpanded] = useBoolean(false);
  const intl = useIntl();

  const expandAriaLabel = intl.formatMessage({
    defaultMessage: 'Expand',
    description: 'An accessible label for expand toggle icon',
  });
  const collapseAriaLabel = intl.formatMessage({
    defaultMessage: 'Collapse',
    description: 'An accessible label for collapse toggle icon',
  });

  const collapsibleProps = collapsible
    ? { 'aria-expanded': expanded, role: 'button', tabIndex: 0, onClick: setExpanded.toggle }
    : undefined;

  const handleRenderLabel = (status: string, label: string): JSX.Element => {
    const props: LabelProps = {
      label,
      status,
    };

    return onRenderLabel?.(props) ?? <Label {...props} />;
  };

  return (
    <>
      <div className="msla-run-after-edge-header">
        <div className="msla-run-after-edge-header-contents-container" {...collapsibleProps}>
          <div>
            <div className="msla-run-after-edge-header-contents">
              <Icon
                className="msla-run-after-icon"
                ariaLabel={format(expanded ? `${collapseAriaLabel} ${title}` : `${expandAriaLabel} ${title}`, title)}
                iconName={expanded ? 'ChevronDownMed' : 'ChevronRightMed'}
                styles={{ root: { color: constants.Settings.CHEVRON_ROOT_COLOR_LIGHT } }}
              />
              <div className="msla-run-after-edge-header-logo">
                <img alt="" className="msla-run-after-logo-image" role="presentation" src={useIcon(title) ?? ''} />
              </div>
              <div className="msla-run-after-edge-header-text">{title}</div>
            </div>
            <RunAfterTrafficLights statuses={statuses} />
          </div>
        </div>
      </div>
      <DeleteButton visible={isDeleteVisible && !readOnly} onDelete={onDelete} />
      {(!collapsible || expanded) && (
        <RunAfterActionStatuses
          isReadOnly={readOnly}
          statuses={statuses}
          onStatusChange={onStatusChange}
          onRenderLabel={handleRenderLabel}
        />
      )}
      <Separator className="msla-run-after-separator" styles={separatorStyles} />
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
    <div className="msla-run-after-delete-icon">
      <IconButton ariaLabel={MENU_DELETE} iconProps={deleteIconProp} styles={deleteIconStyles} onClick={handleDelete} />
    </div>
  );
};

const Label = ({ label, status }: LabelProps): JSX.Element => {
  const checkboxLabelBadge: Record<string, JSX.Element> = {
    [Status.SUCCEEDED]: <Succeeded />,
    [Status.SKIPPED]: <Skipped />,
    [Status.FAILED]: <Failed />,
    [Status.TIMEDOUT]: <TimedOut />,
  };

  return (
    <>
      <div className="msla-run-after-label-badge">{checkboxLabelBadge[status.toUpperCase()]}</div>
      <span>{label}</span>
    </>
  );
};

const useIcon = (selectedNode: string): string => {
  const operationInfo = useOperationInfo(selectedNode);
  return useIconUri(operationInfo).result;
};
