import { CheckmarkCircleFilled, DismissCircleFilled, WarningFilled } from '@fluentui/react-icons';
import { ValidationStatus } from '../../../run-service';
import type { IGroupedGroup } from '../../../run-service';
import { useMemo, useCallback } from 'react';
import { useReviewListStyles } from './reviewListStyles';
import { Skeleton, SkeletonItem, Tree, TreeItem, TreeItemLayout } from '@fluentui/react-components';

export interface IReviewListProps {
  isValidationLoading?: boolean;
  validationGroups: IGroupedGroup[];
}

export const ReviewList: React.FC<IReviewListProps> = ({ isValidationLoading, validationGroups }) => {
  const styles = useReviewListStyles();
  const getGroupIcon = useCallback(
    (groupStatus: string): JSX.Element | null => {
      switch (groupStatus) {
        case ValidationStatus.succeeded: {
          return <CheckmarkCircleFilled fontSize="16px" className={styles.succeededIcon} />;
        }
        case ValidationStatus.succeeded_with_warnings: {
          return <WarningFilled fontSize="16px" className={styles.warningIcon} />;
        }
        case ValidationStatus.failed: {
          return <DismissCircleFilled fontSize="16px" className={styles.failedIcon} />;
        }
        default: {
          return null;
        }
      }
    },
    [styles.failedIcon, styles.succeededIcon, styles.warningIcon]
  );

  const shimmerList = useMemo(() => {
    return new Array(4).fill(0).map((_element, index) => {
      return (
        <div className={styles.shimmerContainer} key={index}>
          <Skeleton>
            <SkeletonItem className={styles.shimmerItem} shape="rectangle" size={24} />
            <SkeletonItem className={styles.shimmerItem} shape="rectangle" size={16} />
            <SkeletonItem className={styles.shimmerItem} shape="rectangle" size={16} />
          </Skeleton>
        </div>
      );
    });
  }, [styles]);

  const TreeItems = useCallback(
    ({ group }: { group?: any }): JSX.Element => {
      const isGroup = group && group.children && group.children.length > 0;
      const name = group ? group.name : '';
      const status = group ? group.status : '';
      const groupIcon = getGroupIcon(group?.status);

      if (isGroup) {
        return (
          <TreeItem itemType="branch">
            <TreeItemLayout iconAfter={groupIcon}>{name}</TreeItemLayout>
            <Tree>
              {group.children.map((child: any, index: number) => (
                <TreeItems key={index} group={child} />
              ))}
            </Tree>
          </TreeItem>
        );
      }
      return (
        <TreeItem itemType="leaf">
          <TreeItemLayout iconAfter={groupIcon}>
            {name} {status}
          </TreeItemLayout>
        </TreeItem>
      );
    },
    [getGroupIcon]
  );

  const treeList = useMemo(() => {
    return (
      <Tree className={styles.reviewTree} aria-label="validation-review-tree">
        {validationGroups.map((group, index) => (
          <TreeItems key={index} group={group} />
        ))}
      </Tree>
    );
  }, [TreeItems, styles.reviewTree, validationGroups]);

  return isValidationLoading ? <>{shimmerList}</> : <>{treeList}</>;
};
