import WarningIcon from '../../../resources/Caution.svg';
import ErrorICon from '../../../resources/Error.svg';
import SuccessIcon from '../../../resources/Success.svg';
import { QueryKeys, ValidationStatus } from '../../../run-service';
import type { IValidationData } from '../../../run-service';
import { ApiService } from '../../../run-service/export';
import type { AppDispatch, RootState } from '../../../state/store';
import { updateValidationState } from '../../../state/vscodeSlice';
import type { InitializedVscodeState } from '../../../state/vscodeSlice';
import { getOverallValidationStatus, getShimmerElements, getValidationListColumns, parseValidationData } from './helper';
import { DetailsRow, GroupedList, GroupHeader, SelectionMode, Shimmer, Text } from '@fluentui/react';
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
    REVIEW_TITLE: intl.formatMessage({
      defaultMessage: 'Review export status',
      description: 'Review export status title',
    }),
    REVIEW_DESCRIPTION: intl.formatMessage({
      defaultMessage:
        "This section shows the export status for elements in your selected logic apps. For example, some parameters types aren't supported, and some connections might not successfully export. For guidance to resolve these issues, review the following steps.",
      description: 'Review export description',
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

  const onValidationSuccess = (successData: IValidationData) => {
    const overallValidationStatus = getOverallValidationStatus(successData);
    dispatch(
      updateValidationState({
        validationState: overallValidationStatus,
      })
    );
  };

  const { data: validationData, isLoading: isValidationLoading } = useQuery<any>(
    [QueryKeys.validation, { selectedWorkflows: selectedWorkflows }],
    validateWorkflows,
    {
      refetchOnWindowFocus: false,
      onSuccess: onValidationSuccess,
    }
  );

  const { validationItems = [], validationGroups = [] }: any =
    isValidationLoading || !validationData ? {} : parseValidationData(validationData);

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

  const shimmerList = useMemo(() => {
    const shimmerDetails = getShimmerElements();

    return new Array(4).fill(0).map((_element, index) => {
      return (
        <div className="msla-export-validation-list-shimmer" key={index}>
          <Shimmer className="msla-export-validation-list-shimmer-item" />
          <Shimmer className="msla-export-validation-list-shimmer-item" shimmerElements={shimmerDetails.firstRow} />
          <Shimmer className="msla-export-validation-list-shimmer-item" shimmerElements={shimmerDetails.secondRow} />
        </div>
      );
    });
  }, []);

  const groupedList = useMemo(() => {
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
              compact={true}
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
      <GroupedList
        items={validationItems}
        groups={validationGroups}
        onRenderCell={onRenderCell}
        selectionMode={SelectionMode.none}
        compact={true}
        groupProps={groupedListProps}
      />
    );
  }, [validationItems, validationGroups]);

  const validationList = isValidationLoading ? shimmerList : groupedList;

  return (
    <div className="msla-export-validation">
      <Text variant="xLarge" block>
        {intlText.REVIEW_TITLE}
      </Text>
      <Text variant="large" block>
        {intlText.REVIEW_DESCRIPTION}
      </Text>
      <div className="msla-export-validation-list">{validationList}</div>
    </div>
  );
};
