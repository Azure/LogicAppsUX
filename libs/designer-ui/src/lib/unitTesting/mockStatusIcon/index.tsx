import Constants from '../../constants';
import { getMockStatusString } from '../../utils';
import type { OutputMock } from '../outputMocks';
import { Completed } from './completed';
import { Empty } from './empty';
import { mergeClasses } from '@fluentui/react-components';
import { useMockStatusIconStyles } from './mockStatusIcon.styles';

export interface MockStatusIconProps {
  nodeMockResults?: OutputMock;
  id: string;
}

/**
 * Renders a mock status icon based on the provided node mock results and ID.
 * @param {MockStatusIconProps} props - The component props.
 * @returns {React.ReactElement} The rendered mock status icon.
 */
export const MockStatusIcon: React.FC<MockStatusIconProps> = ({ nodeMockResults, id }) => {
  const styles = useMockStatusIconStyles();
  const status = nodeMockResults && nodeMockResults.isCompleted ? Constants.MOCKSTATUS.COMPLETED : Constants.MOCKSTATUS.EMPTY;
  const tooltipLabel = getMockStatusString(status);

  const getIcon = (status: string) => {
    switch (status) {
      case Constants.MOCKSTATUS.COMPLETED:
        return <Completed />;
      case Constants.MOCKSTATUS.EMPTY:
      default:
        return <Empty />;
    }
  };

  return (
    <div id={id} aria-label={tooltipLabel} role="status" className={mergeClasses(styles.mockStatusIcon, 'msla-mock-status-icon')}>
      {getIcon(status)}
    </div>
  );
};
