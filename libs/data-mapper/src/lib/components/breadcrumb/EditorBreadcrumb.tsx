import type { RootState } from '../../core/state/Store';
import { Breadcrumb } from '@fluentui/react';
import { useSelector } from 'react-redux';

const maxBreadcrumbItems = 3;

export const EditorBreadcrumb = (): JSX.Element => {
  const breadcrumbItems = useSelector((state: RootState) => state.breadcrumb.breadcrumbItems);

  return <Breadcrumb items={breadcrumbItems} maxDisplayedItems={maxBreadcrumbItems} />;
};
