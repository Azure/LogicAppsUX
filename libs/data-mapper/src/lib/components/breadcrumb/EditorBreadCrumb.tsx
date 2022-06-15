import type { RootState } from '../../core/state/Store';
import { Breadcrumb } from '@fluentui/react';
import { useSelector } from 'react-redux';

const maxBreadCrumbItems = 3;

export const EditorBreadCrumb = (): JSX.Element => {
  const breadcrumbItems = useSelector((state: RootState) => state.breadCrumb.breadcrumbItems);

  return <Breadcrumb items={breadcrumbItems} maxDisplayedItems={maxBreadCrumbItems} />;
};
