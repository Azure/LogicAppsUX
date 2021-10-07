import { Callout, ICalloutProps } from '@fluentui/react/lib/Callout';
import { IPivotProps, Pivot, PivotItem } from '@fluentui/react/lib/Pivot';
import * as React from 'react';

import { AnnouncedMatches } from '../announcedmatches';
import { OperationResults } from './operationresults';
import { DisableableOperation, Operation, OperationKind, ShowMode } from './models';
import { UserVoiceProps } from './uservoice';

export interface OperationsProps {
  canShowMoreOperations: boolean;
  disabled?: boolean;
  extraOperations: Operation[];
  filterText: string;
  isLoading: boolean;
  isPanelModeEnabled?: boolean;
  operationCalloutProps?: ICalloutProps;
  operationKinds: OperationKind[];
  operations: Operation[];
  selectedKind: string;
  showMode: ShowMode;
  userVoiceProps?: UserVoiceProps;
  visible: boolean;
  onKindClick?(item: PivotItem): void;
  onRenderOperation?(item: DisableableOperation): JSX.Element;
  onSeeMoreOperationsClick?(): void;
  resultsRenderer?: React.ComponentType;
}

export const Operations: React.FC<OperationsProps> = (props) => {
  const {
    disabled = false,
    extraOperations,
    filterText,
    isLoading,
    operationCalloutProps,
    operationKinds,
    operations,
    selectedKind,
    showMode,
    userVoiceProps,
    onKindClick,
    visible,
  } = props;
  if (!visible) {
    return null;
  }

  const operationCallout = operationCalloutProps ? <Callout {...operationCalloutProps} /> : null;

  const operationsClassName = showMode === ShowMode.Operations ? 'msla-operations msla-operations-only' : 'msla-operations';

  const itemsBeforeOperations: DisableableOperation[] = extraOperations.map((extraOperation) => ({ ...extraOperation, disabled }));
  const operationItems: DisableableOperation[] = operations.map((operation) => ({ ...operation, disabled }));
  const itemsAfterOperations: UserVoiceProps[] = userVoiceProps ? [{ ...userVoiceProps, disabled }] : [];

  const items: (DisableableOperation | UserVoiceProps)[] = [...itemsBeforeOperations, ...operationItems, ...itemsAfterOperations];

  const pivotProps: Partial<IPivotProps> = {
    ...(!disabled ? { onLinkClick: onKindClick as any } : undefined),
  };

  return (
    <div className={operationsClassName}>
      <Pivot className="msla-operations-pivot" headersOnly={true} selectedKey={selectedKind} {...pivotProps}>
        {operationKinds.map(({ itemKey, linkText }: OperationKind) => (
          <PivotItem key={itemKey} itemKey={itemKey} headerText={linkText} />
        ))}
      </Pivot>
      <OperationResults {...props} items={items} />
      <AnnouncedMatches
        count={operationItems.length}
        isLoading={isLoading}
        visible={showMode !== ShowMode.Connectors && filterText.length > 0}
      />
      {operationCallout}
    </div>
  );
};
