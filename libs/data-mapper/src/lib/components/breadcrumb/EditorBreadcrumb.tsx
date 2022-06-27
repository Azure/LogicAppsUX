import { setCurrentOutputNode } from '../../core/state/SchemaSlice';
import type { AppDispatch, RootState } from '../../core/state/Store';
import type { PathItem, SchemaExtended, SchemaNodeExtended } from '../../models/Schema';
import type { IBreadcrumbItem } from '@fluentui/react';
import { Breadcrumb } from '@fluentui/react';
import { useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';

const maxBreadcrumbItems = 3;
const overflowIndex = 1;

export const EditorBreadcrumb = (): JSX.Element => {
  const dispatch = useDispatch<AppDispatch>();
  const outputSchema = useSelector((state: RootState) => state.schema.outputSchema);
  const currentOutputNode = useSelector((state: RootState) => state.schema.currentOutputNode);

  const breadcrumbItems = useMemo<IBreadcrumbItem[]>(() => {
    if (outputSchema) {
      return convertToBreadcrumbItems(dispatch, outputSchema, currentOutputNode);
    }

    return [];
  }, [dispatch, outputSchema, currentOutputNode]);

  return breadcrumbItems.length < 1 ? (
    // Breadcrumb doesn't display when empty, this is a breadcrumb space placeholder
    <div style={{ height: '37px', marginTop: '11px' }}></div>
  ) : (
    <Breadcrumb items={breadcrumbItems} maxDisplayedItems={maxBreadcrumbItems} overflowIndex={overflowIndex} />
  );
};

const convertToBreadcrumbItems = (dispatch: AppDispatch, schema: SchemaExtended, currentNode?: SchemaNodeExtended) => {
  const rootItem = {
    key: schema.name,
    text: schema.name,
    // TODO (14748905): Click root to view map overview, not top node
    onClick: () => {
      dispatch(setCurrentOutputNode(schema.schemaTreeRoot));
    },
  };

  const breadcrumbItems = [rootItem];

  if (currentNode?.pathToRoot) {
    currentNode.pathToRoot.forEach((pathItem) => {
      breadcrumbItems.push({
        key: pathItem.key,
        text: pathItem.name,
        onClick: () => {
          const destinationNode = findChildNode(schema.schemaTreeRoot, [...currentNode.pathToRoot]);
          dispatch(setCurrentOutputNode(destinationNode));
        },
      });
    });
  }

  return breadcrumbItems;
};

const findChildNode = (schemaNode: SchemaNodeExtended, pathItems: PathItem[]): SchemaNodeExtended => {
  if (pathItems.length > 1) {
    const nextPathItem = pathItems.shift();
    const nextChild = schemaNode.children.find((child) => child.key === nextPathItem?.key);
    if (nextChild) {
      return findChildNode(nextChild, pathItems);
    }
  }

  return schemaNode;
};
