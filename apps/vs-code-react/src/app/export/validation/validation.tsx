import { QueryKeys } from '../../../run-service';
import type { IValidationData } from '../../../run-service';
import { ApiService } from '../../../run-service/export';
import { updateValidationState } from '../../../state/WorkflowSlice';
import type { AppDispatch, RootState } from '../../../state/store';
import { ReviewList } from '../../components/reviewList/reviewList';
import { getOverallValidationStatus, parseValidationData } from './helper';
import { MessageBar, MessageBarType, Text } from '@fluentui/react';
import { useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useQuery } from 'react-query';
import { useDispatch, useSelector } from 'react-redux';

export const Validation: React.FC = () => {
  const workflowState = useSelector((state: RootState) => state.workflow);
  const { baseUrl, accessToken, exportData, cloudHost } = workflowState;
  const { selectedWorkflows, location, selectedSubscription, selectedAdvanceOptions } = exportData;

  const dispatch: AppDispatch = useDispatch();
  const intl = useIntl();

  const intlText = {
    WORKFLOW_GROUP_DISPLAY_NAME: intl.formatMessage({
      defaultMessage: 'Workflow',
      id: '42jhB0',
      description: 'Review export status title',
    }),
    REVIEW_TITLE: intl.formatMessage({
      defaultMessage: 'Review export status',
      id: 'Z1yTm5',
      description: 'Review export status title',
    }),
    REVIEW_DESCRIPTION: intl.formatMessage({
      defaultMessage: `This section shows the export status for elements in your selected logic apps. For example, some parameters types aren't supported, and some connections might not successfully export. For guidance to resolve these issues, review the following steps.`,
      id: 'bv6P+5',
      description: 'Review export description',
    }),
  };

  const apiService = useMemo(() => {
    return new ApiService({
      baseUrl,
      accessToken,
      cloudHost,
    });
  }, [accessToken, baseUrl, cloudHost]);

  const validateWorkflows = () => {
    return apiService.validateWorkflows(selectedWorkflows, selectedSubscription, location, selectedAdvanceOptions);
  };

  const onValidationSuccess = (successData: { properties: IValidationData }) => {
    const overallValidationStatus = getOverallValidationStatus(successData?.properties);
    dispatch(
      updateValidationState({
        validationState: overallValidationStatus,
      })
    );
  };

  const {
    data: validationData,
    isLoading: isValidationLoading,
    error,
    isError,
  } = useQuery<any>([QueryKeys.validation, { selectedWorkflows: selectedWorkflows }], validateWorkflows, {
    refetchOnWindowFocus: false,
    onSuccess: onValidationSuccess,
  });

  const { validationItems = [], validationGroups = [] }: any =
    isValidationLoading || !validationData ? {} : parseValidationData(validationData?.properties, intlText.WORKFLOW_GROUP_DISPLAY_NAME);

  const validationError = useMemo(() => {
    return isError ? (
      <MessageBar messageBarType={MessageBarType.error} isMultiline={true}>
        {(error as any)?.message}
      </MessageBar>
    ) : null;
  }, [isError, error]);

  return (
    <div className="msla-export-validation">
      <Text variant="xLarge" block>
        {intlText.REVIEW_TITLE}
      </Text>
      <Text variant="large" block>
        {intlText.REVIEW_DESCRIPTION}
      </Text>
      <div className="msla-export-validation-list">
        {isError ? validationError : null}
        <ReviewList isValidationLoading={isValidationLoading} validationItems={validationItems} validationGroups={validationGroups} />
      </div>
    </div>
  );
};
