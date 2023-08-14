import Constants from '../constants';
import { Icon, Link } from '@fluentui/react';
import type { IIconStyles } from '@fluentui/react';
import { useIntl } from 'react-intl';

const navigateIconStyle: IIconStyles = {
  root: {
    color: Constants.BRAND_COLOR,
  },
};

type OnClickHandler = () => void;

export interface WorkflowParametersFooterProps {
  onManageParameters?: OnClickHandler;
}

export function WorkflowParametersFooter({ onManageParameters }: WorkflowParametersFooterProps): JSX.Element {
  const ManageParametersLink = (): JSX.Element => {
    const intl = useIntl();

    const jsonText = intl.formatMessage({
      defaultMessage: 'Edit in JSON',
      description: 'Parameter Link Text',
    });

    return (
      <div className="msla-workflow-parameters-link">
        <Link className="msla-workflow-parameters-link-text" onClick={onManageParameters}>
          {jsonText}
        </Link>
        <Icon iconName="NavigateExternalInline" styles={navigateIconStyle} className="msla-workflow-parameters-link-icon" />
      </div>
    );
  };

  return <>{onManageParameters ? <ManageParametersLink /> : null}</>;
}
