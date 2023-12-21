import constants from '../../../../common/constants';
import { useIconUri } from '../../../../core/state/selectors/actionMetadataSelector';
import { useNodeDisplayName } from '../../../../core/state/workflow/workflowSelectors';
import { RunAfterActionStatuses } from './runafteractionstatuses';
import { RunAfterTrafficLights } from './runaftertrafficlights';
import { useTheme } from '@fluentui/react';
import { Button, Text } from '@fluentui/react-components';
import { useBoolean } from '@fluentui/react-hooks';
import { bundleIcon, Delete24Filled, Delete24Regular } from '@fluentui/react-icons';
import { Icon } from '@fluentui/react/lib/Icon';
import type { ISeparatorStyles } from '@fluentui/react/lib/Separator';
import { Separator } from '@fluentui/react/lib/Separator';
import type { MouseEvent } from 'react';
import { useIntl } from 'react-intl';
import { format } from 'util';

const DeleteIcon = bundleIcon(Delete24Filled, Delete24Regular);

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

const separatorStyles: Partial<ISeparatorStyles> = {
  root: {
    color: '#d4d4d4',
  },
};

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
              <img alt="" className="msla-run-after-node-image" role="presentation" src={icon} />
              <Text weight="semibold" className="msla-run-after-node-title">
                {title}
              </Text>
              <RunAfterTrafficLights statuses={statuses} />
              <DeleteButton visible={isDeleteVisible && !readOnly} onDelete={onDelete} />
            </div>
          </div>
        </div>
      </div>

      {(!collapsible || expanded) && <RunAfterActionStatuses isReadOnly={readOnly} statuses={statuses} onStatusChange={onStatusChange} />}
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
    <Button
      appearance="subtle"
      icon={<DeleteIcon />}
      aria-label={MENU_DELETE}
      onClick={handleDelete}
      style={{ color: 'var(--colorBrandForeground1)' }}
    />
  );
};
