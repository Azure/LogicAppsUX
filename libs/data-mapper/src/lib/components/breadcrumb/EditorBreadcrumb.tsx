import { setCurrentTargetSchemaNode } from '../../core/state/DataMapSlice';
import type { AppDispatch, RootState } from '../../core/state/Store';
import { findNodeForKey } from '../../utils/Schema.Utils';
import type { IBreadcrumbItem, IContextualMenuItem, IContextualMenuProps, IDividerAsProps } from '@fluentui/react';
import { Breadcrumb, ContextualMenu, IconButton } from '@fluentui/react';
import { Button, tokens, makeStyles, Text, typographyStyles } from '@fluentui/react-components';
import { Code20Regular } from '@fluentui/react-icons';
import type { SchemaExtended, SchemaNodeExtended } from '@microsoft/logic-apps-shared';
import { useCallback, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';

const maxBreadcrumbItems = 4;
const overflowIndex = 1;
const placeholderItemKey = 'placeholder';

const baseBreadcrumbContainerStyles: React.CSSProperties = {
  height: '32px',
  padding: '4px 8px',
  marginBottom: '8px',
  backgroundColor: tokens.colorNeutralBackground1,
  borderRadius: tokens.borderRadiusMedium,
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
};

const baseBreadcrumbStyles: React.CSSProperties = {
  margin: 0,
};

const useStyles = makeStyles({
  codeIcon: {
    color: tokens.colorBrandForeground1,
  },
});

interface EditorBreadcrumbProps {
  isCodeViewOpen: boolean;
  setIsCodeViewOpen: (isOpen: boolean) => void;
}

export const EditorBreadcrumb = ({ isCodeViewOpen, setIsCodeViewOpen }: EditorBreadcrumbProps): JSX.Element => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();
  const targetSchema = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.targetSchema);
  const currentTargetSchemaNode = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.currentTargetSchemaNode);
  const styles = useStyles();

  const startMappingLoc = intl.formatMessage({
    defaultMessage: 'Select a target schema node to start mapping',
    id: '0IRUjM',
    description: 'Breadcrumb message shown in overview',
  });

  const showCodeLoc = intl.formatMessage({
    defaultMessage: 'Show code',
    id: 'MirIsS',
    description: 'Button to display the code view',
  });

  const hideCodeLoc = intl.formatMessage({
    defaultMessage: 'Hide code',
    id: 'UR1CS5',
    description: 'Button to hide the code view',
  });

  const chevronAriaDescription = intl.formatMessage({
    defaultMessage: 'Expant list of sibling elements',
    id: 'BUutcC',
    description: 'Button that toggles list of elements to view',
  });

  const breadcrumbItems = useMemo<IBreadcrumbItem[]>(() => {
    if (targetSchema) {
      return convertToBreadcrumbItems(dispatch, targetSchema, startMappingLoc, currentTargetSchemaNode);
    }

    return [];
  }, [dispatch, targetSchema, startMappingLoc, currentTargetSchemaNode]);

  const isCodeViewButtonDisabled = useMemo<boolean>(() => breadcrumbItems.length === 0, [breadcrumbItems]);

  const onRenderBreadcrumbContent = useCallback((item?: IBreadcrumbItem) => {
    if (!item) {
      return null;
    }

    if (item.key === placeholderItemKey) {
      return (
        <Text aria-disabled={true} style={{ ...typographyStyles.body1, color: tokens.colorNeutralStroke1 }}>
          {item.text}
        </Text>
      );
    }
    return <Text>{item.text}</Text>;
  }, []);

  const getMenu = (props: IContextualMenuProps): JSX.Element => {
    // Customize contextual menu with menuAs
    return <ContextualMenu {...props} />;
  };

  const getMenuProps = (item: IBreadcrumbItem | undefined): IContextualMenuProps => {
    let childItems: IContextualMenuItem[] = [];
    if (item && targetSchema) {
      const schemaKey = item.key;
      const schemaNode = findNodeForKey(schemaKey, targetSchema.schemaTreeRoot, false);
      if (schemaNode) {
        childItems = schemaNode.children.map((childNode) => {
          return {
            key: childNode.key,
            text: childNode.name,
            onClick: (_event, item) => {
              if (item) {
                const newNode = findNodeForKey(item.key, schemaNode, false);
                if (newNode) {
                  dispatch(setCurrentTargetSchemaNode(newNode));
                  return;
                }
              }

              dispatch(setCurrentTargetSchemaNode(targetSchema.schemaTreeRoot));
            },
          };
        });
      }
    }

    return {
      items: childItems,
    };
  };

  const getCustomDivider = (dividerProps: IDividerAsProps): JSX.Element => {
    const item = dividerProps.item;

    return (
      <IconButton
        iconProps={{ iconName: dividerProps.iconName }}
        menuProps={getMenuProps(item)}
        menuAs={getMenu}
        onRenderMenuIcon={() => null}
        ariaDescription={chevronAriaDescription}
      />
    );
  };

  return (
    <div style={baseBreadcrumbContainerStyles}>
      <Breadcrumb
        // Returning undefined here stops the breadcrumb from shrinking
        onReduceData={() => undefined}
        items={breadcrumbItems}
        maxDisplayedItems={maxBreadcrumbItems}
        overflowIndex={currentTargetSchemaNode ? overflowIndex : 0}
        onRenderItemContent={onRenderBreadcrumbContent}
        styles={{ item: { lineHeight: 0 } }}
        style={baseBreadcrumbStyles}
        dividerAs={getCustomDivider}
      />
      <Button
        appearance="subtle"
        size="medium"
        icon={
          <Code20Regular
            className={styles.codeIcon}
            style={isCodeViewButtonDisabled ? { color: tokens.colorNeutralForegroundDisabled } : undefined}
          />
        }
        onClick={() => {
          setIsCodeViewOpen(!isCodeViewOpen);
        }}
        disabled={isCodeViewButtonDisabled}
      >
        {isCodeViewOpen ? hideCodeLoc : showCodeLoc}
      </Button>
    </div>
  );
};

const convertToBreadcrumbItems = (
  dispatch: AppDispatch,
  schema: SchemaExtended,
  breadcrumbPlaceholder: string,
  currentNode?: SchemaNodeExtended
) => {
  const rootItem: IBreadcrumbItem = {
    key: schema.name,
    text: schema.name,
    disabled: true,
  };

  const breadcrumbItems = [rootItem];

  if (currentNode?.pathToRoot) {
    currentNode.pathToRoot.forEach((pathItem) => {
      breadcrumbItems.push({
        key: pathItem.key,
        text: pathItem.name,
        onClick: (_event, item) => {
          if (item) {
            const newNode = findNodeForKey(item.key, schema.schemaTreeRoot, false);
            if (newNode) {
              dispatch(setCurrentTargetSchemaNode(newNode));
              return;
            }
          }

          dispatch(setCurrentTargetSchemaNode(schema.schemaTreeRoot));
        },
      });
    });
  }

  // When in overview (at schema root, NOT schemaTreeRoot), show placeholder text
  if (breadcrumbItems.length === 1) {
    breadcrumbItems.push({
      key: 'placeholder',
      text: breadcrumbPlaceholder,
    });
  }

  return breadcrumbItems;
};
