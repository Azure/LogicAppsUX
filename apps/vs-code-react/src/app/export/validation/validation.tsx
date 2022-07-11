import { QueryKeys } from '../../../run-service';
import { ApiService } from '../../../run-service/export';
import type { RootState } from '../../../state/store';
import type { InitializedVscodeState } from '../../../state/vscodeSlice';
import { getValidationColumns, parseValidationData } from './helper';
import { DetailsRow, GroupedList, SelectionMode } from '@fluentui/react';
import type { IGroup } from '@fluentui/react';
import { useMemo } from 'react';
import { useQuery } from 'react-query';
import { useSelector } from 'react-redux';

export const Validation: React.FC = () => {
  const vscodeState = useSelector((state: RootState) => state.vscode);
  const { baseUrl, accessToken, exportData } = vscodeState as InitializedVscodeState;
  const { selectedWorkflows, location, selectedSubscription } = exportData;

  const apiService = useMemo(() => {
    return new ApiService({
      baseUrl,
      accessToken,
    });
  }, [accessToken, baseUrl]);

  const validateWorkflows = () => {
    return apiService.validateWorkflows(selectedWorkflows, selectedSubscription, location);
  };

  const { data: validationData, isLoading: isValidationLoading } = useQuery<any>(QueryKeys.validation, validateWorkflows, {
    refetchOnWindowFocus: false,
  });

  const validationItems: any[] = isValidationLoading || !validationData ? [] : parseValidationData(validationData);

  console.log(validationData, validationItems);

  const onRenderCell = (nestingDepth?: number, item?: any, itemIndex?: number, group?: IGroup): React.ReactNode => {
    return item && typeof itemIndex === 'number' && itemIndex > -1 ? (
      <DetailsRow
        columns={getValidationColumns()}
        groupNestingDepth={nestingDepth}
        item={item}
        itemIndex={itemIndex}
        selectionMode={SelectionMode.none}
        compact={true}
        group={group}
      />
    ) : null;
  };

  return (
    <div className="msla-export-validation">
      <GroupedList items={validationItems} onRenderCell={onRenderCell} selectionMode={SelectionMode.none} compact={true} />
    </div>
  );
};
