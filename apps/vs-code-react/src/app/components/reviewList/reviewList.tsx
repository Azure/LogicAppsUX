import WarningIcon from '../../../resources/Caution.svg';
import ErrorICon from '../../../resources/Error.svg';
import SuccessIcon from '../../../resources/Success.svg';
import { ValidationStatus } from '../../../run-service';
import type { IGroupedGroup, IGroupedItem } from '../../../run-service';
import { getShimmerElements, getValidationListColumns } from './helper';
import './styles.less';
import { DetailsRow, GroupedList, GroupHeader, SelectionMode, Shimmer } from '@fluentui/react';
import type { IGroup } from '@fluentui/react';
import { useMemo } from 'react';

export interface IReviewListProps {
  isValidationLoading?: boolean;
  validationItems: IGroupedItem[];
  validationGroups: IGroupedGroup[];
}

export const ReviewList: React.FC<IReviewListProps> = ({ isValidationLoading, validationItems, validationGroups }) => {
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
        <div className="review-list-shimmer" key={index}>
          <Shimmer className="review-list-shimmer-item" />
          <Shimmer className="review-list-shimmer-item" shimmerElements={shimmerDetails.firstRow} />
          <Shimmer className="review-list-shimmer-item" shimmerElements={shimmerDetails.secondRow} />
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
          <div className="review-list-header">
            <GroupHeader
              className="review-list-header-text"
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
      <div className="review-list">
        <GroupedList
          items={validationItems}
          groups={validationGroups}
          onRenderCell={onRenderCell}
          selectionMode={SelectionMode.none}
          compact={true}
          groupProps={groupedListProps}
        />
      </div>
    );
  }, [validationItems, validationGroups]);

  return isValidationLoading ? <>{shimmerList}</> : <>{groupedList}</>;
};
