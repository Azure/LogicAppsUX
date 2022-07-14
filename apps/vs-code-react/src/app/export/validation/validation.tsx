import WarningIcon from '../../../resources/Caution.svg';
import ErrorICon from '../../../resources/Error.svg';
import SuccessIcon from '../../../resources/Success.svg';
import { QueryKeys, ValidationStatus } from '../../../run-service';
import type { IValidationData } from '../../../run-service';
import { ApiService } from '../../../run-service/export';
import type { AppDispatch, RootState } from '../../../state/store';
import { updateValidationState } from '../../../state/vscodeSlice';
import type { InitializedVscodeState } from '../../../state/vscodeSlice';
import { getOverallValidationStatus, getValidationListColumns, parseValidationData } from './helper';
import { DetailsRow, GroupedList, GroupHeader, SelectionMode, Text } from '@fluentui/react';
import type { IGroup } from '@fluentui/react';
import { useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useQuery } from 'react-query';
import { useDispatch, useSelector } from 'react-redux';

export const Validation: React.FC = () => {
  const vscodeState = useSelector((state: RootState) => state.vscode);
  const { baseUrl, accessToken, exportData } = vscodeState as InitializedVscodeState;
  const { selectedWorkflows, location, selectedSubscription } = exportData;

  const dispatch: AppDispatch = useDispatch();
  const intl = useIntl();

  const intlText = {
    VALIDATION_TITLE: intl.formatMessage({
      defaultMessage: 'Validate exports',
      description: 'Validate exports title',
    }),
  };

  const apiService = useMemo(() => {
    return new ApiService({
      baseUrl,
      accessToken,
    });
  }, [accessToken, baseUrl]);

  const validateWorkflows = () => {
    return apiService.validateWorkflows(selectedWorkflows, selectedSubscription, location);
  };

  const onValidationSuccess = (test: IValidationData) => {
    const overallValidationStatus = getOverallValidationStatus(test);
    dispatch(
      updateValidationState({
        validationState: overallValidationStatus,
      })
    );
  };

  const { data: validationData, isLoading: isValidationLoading } = useQuery<any>(QueryKeys.validation, validateWorkflows, {
    refetchOnWindowFocus: false,
    onSuccess: onValidationSuccess,
  });

  const { validationItems = [], validationGroups = [] }: any =
    isValidationLoading || !validationData ? {} : parseValidationData(validationData);

  const onRenderCell = (nestingDepth?: number, item?: any, itemIndex?: number, group?: IGroup): React.ReactNode => {
    return item && typeof itemIndex === 'number' && itemIndex > -1 ? (
      <DetailsRow
        columns={getValidationListColumns()}
        groupNestingDepth={nestingDepth}
        item={item}
        itemIndex={itemIndex}
        selectionMode={SelectionMode.none}
        compact={true}
        group={group}
      />
    ) : null;
  };

  const getGroupIcon = (groupStatus: string): JSX.Element | null => {
    switch (groupStatus) {
      case ValidationStatus.succeeded: {
        return <img src={SuccessIcon} alt="Success" />;
      }
      case ValidationStatus.succeeded_with_warnings: {
        return <img src={WarningIcon} alt="Warnings" />;
      }
      case ValidationStatus.failed: {
        return <img src={ErrorICon} alt="Fail" />;
      }
      default: {
        return null;
      }
    }
  };

  const onRenderHeader = (props?: any): JSX.Element | null => {
    if (props) {
      const toggleCollapse = (): void => {
        props.onToggleCollapse(props.group);
      };

      const headerCountStyle = { display: 'none' };
      const groupIcon = getGroupIcon(props?.group?.status);

      return (
        <div className="msla-export-validation-list-header">
          <GroupHeader
            className="msla-export-validation-list-header-text"
            styles={{ headerCount: headerCountStyle }}
            {...props}
            onToggleSelectGroup={toggleCollapse}
          />
          {groupIcon}
        </div>
      );
    }

    return null;
  };

  const groupedListProps = {
    onRenderHeader,
  };

  return (
    <div className="msla-export-validation">
      <Text variant="xLarge" nowrap block>
        {intlText.VALIDATION_TITLE}
      </Text>
      <div className="msla-export-validation-list">
        <GroupedList
          items={validationItems}
          groups={validationGroups}
          onRenderCell={onRenderCell}
          selectionMode={SelectionMode.none}
          compact={true}
          groupProps={groupedListProps}
        />
      </div>
    </div>
  );
};
