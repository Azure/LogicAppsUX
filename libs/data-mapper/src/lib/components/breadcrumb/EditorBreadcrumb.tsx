import type { RootState } from '../../core/state/Store';
import type { SchemaExtended, SchemaNodeExtended } from '../../models/Schema';
import { Breadcrumb } from '@fluentui/react';
import { createSelector } from '@reduxjs/toolkit';
import { useSelector } from 'react-redux';

const maxBreadcrumbItems = 3;
const overflowIndex = 1;

const outputSchema = (state: RootState) => state.schema.outputSchema;
const currentOutputNode = (state: RootState) => state.schema.currentOutputNode;
//const dispatch = (state: RootState) => state.
export const breadCrumbItemSelector = createSelector([outputSchema, currentOutputNode], (outputSchema, currentOutputNode) => {
  if (outputSchema) {
    return convertToBreadcrumbItems(outputSchema, currentOutputNode);
  }

  return [];
});

export const EditorBreadcrumb = (): JSX.Element => {
  const breadcrumbItems = useSelector(breadCrumbItemSelector);
  return <Breadcrumb items={breadcrumbItems} maxDisplayedItems={maxBreadcrumbItems} overflowIndex={overflowIndex} />;
};

const convertToBreadcrumbItems = (schema: SchemaExtended, currentNode?: SchemaNodeExtended) => {
  const rootItem = {
    key: schema.name,
    text: schema.name,
    // TODO (14748905): Click root to view map overview, not top node
    onClick: () => {
      //dispatch(setCurrentOutputNode(schema.schemaTreeRoot));
    },
  };

  const breadcrumbItems = [rootItem];

  if (currentNode?.pathToRoot) {
    currentNode.pathToRoot.forEach((pathItem) => {
      breadcrumbItems.push({
        key: pathItem.name,
        text: pathItem.name,
        onClick: () => {
          // dispatch(setCurrentOutputNode(currentNode));
        },
      });
    });
  }

  return breadcrumbItems;
};
