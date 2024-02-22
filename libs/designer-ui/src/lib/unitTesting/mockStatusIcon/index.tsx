import Constants from '../../constants';
import { getMockStatusString } from '../../utils';
import { Empty } from './empty';
import './mockStatusIcon.less';
import { Succeeded } from './succeeded';

export interface MockStatusIconProps {
  status: string;
  id: string;
}

/**
 * Renders a mock status icon component.
 * @param {MockStatusIconProps} props - The props for the component.
 * @param {string} props.status - The status of the mock.
 * @param {string} props.id - The ID of the component.
 * @returns {React.ReactElement} The rendered mock status icon component.
 */
export const MockStatusIcon: React.FC<MockStatusIconProps> = ({ status, id }) => {
  const tooltipLabel = getMockStatusString(status);

  const getIcon = (status: string) => {
    switch (status) {
      case Constants.MOCKSTATUS.SUCCEEDED:
        return <Succeeded />;
      case Constants.MOCKSTATUS.EMPTY:
      default:
        return <Empty />;
    }
  };

  return (
    <div id={id} aria-label={tooltipLabel} role="status" className="msla-mock-status-icon">
      {getIcon(status)}
    </div>
  );
};
