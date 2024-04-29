import type { RootState } from 'lib/core/state/Store';
import { useSelector } from 'react-redux';

// export interface TemplatesDesignerProps {}

export const TemplatesDesigner = (
  // {}: TemplatesDesignerProps
) => {
  const template = useSelector((state: RootState) => state.template.template);

  return <div>{JSON.stringify(template)}</div>;
};
