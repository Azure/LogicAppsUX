import constants from '../../../../common/constants';
import { useIconUri } from '../../../../core/state/selectors/actionMetadataSelector';
import { useNodeDisplayName } from '../../../../core/state/workflow/workflowSelectors';
import { RunAfterActionStatuses } from './runafteractionstatuses';
import { RunAfterTrafficLights } from './runaftertrafficlights';
import { useTheme } from '@fluentui/react';
import { useBoolean } from '@fluentui/react-hooks';
import type { IButtonStyles } from '@fluentui/react/lib/Button';
import { IconButton } from '@fluentui/react/lib/Button';
import type { IIconProps } from '@fluentui/react/lib/Icon';
import { Icon } from '@fluentui/react/lib/Icon';
import type { ISeparatorStyles } from '@fluentui/react/lib/Separator';
import { Separator } from '@fluentui/react/lib/Separator';
import { Failed, Skipped, Succeeded, TimedOut } from '@microsoft/designer-ui';
import { RUN_AFTER_STATUS } from '@microsoft/utils-logic-apps';
import type { MouseEvent } from 'react';
import { useIntl } from 'react-intl';
import { format } from 'util';

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
  id,
  onDelete,
  onStatusChange,
  onRenderLabel,
}: RunAfterActionDetailsProps) => {
  const [expanded, setExpanded] = useBoolean(false);

  const theme = useTheme();
  const isInverted = theme.isInverted;

  const intl = useIntl();

  const expandAriaLabel = intl.formatMessage({
    defaultMessage: 'Expand',
    description: 'An accessible label for expand toggle icon',
  });
  const collapseAriaLabel = intl.formatMessage({
    defaultMessage: 'Collapse',
    description: 'An accessible label for collapse toggle icon',
  });

  const collapsibleProps: React.HTMLAttributes<HTMLDivElement> | undefined = collapsible
    ? {
        'aria-expanded': expanded,
        role: 'button',
        tabIndex: 0,
        onClick: setExpanded.toggle,
        onKeyDown: (key) => {
          if (key.code === 'Space' || key.code === 'Enter') {
            setExpanded.toggle();
          }
        },
      }
    : undefined;

  const handleRenderLabel = (status: string, label: string): JSX.Element => {
    const props: LabelProps = {
      label,
      status,
    };

    return onRenderLabel?.(props) ?? <Label {...props} />;
  };

  const title = useNodeDisplayName(id);
  const icon = useIconUri(id);
  return (
    <>
      <div className="msla-run-after-edge-header">
        <div className="msla-run-after-edge-header-contents-container" {...collapsibleProps}>
          <div>
            <div className="msla-run-after-edge-header-contents">
              <Icon
                className="msla-run-after-icon"
                aria-label={format(expanded ? `${collapseAriaLabel} ${title}` : `${expandAriaLabel} ${title}`, title)}
                iconName={expanded ? 'ChevronDownMed' : 'ChevronRightMed'}
                styles={{ root: { color: isInverted ? 'white' : constants.Settings.CHEVRON_ROOT_COLOR_LIGHT } }}
              />
              <div className="msla-run-after-edge-header-logo">
                <img alt="" className="msla-run-after-logo-image" role="presentation" src={icon} />
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
    [RUN_AFTER_STATUS.SUCCEEDED]: <Succeeded />,
    [RUN_AFTER_STATUS.SKIPPED]: <Skipped />,
    [RUN_AFTER_STATUS.FAILED]: <Failed />,
    [RUN_AFTER_STATUS.TIMEDOUT]: <TimedOut />,
  };

  return (
    <>
      <div className="msla-run-after-label-badge">{checkboxLabelBadge[status.toUpperCase()]}</div>
      <span>{label}</span>
    </>
  );
};
