import { openUpdateSourceSchemaPanelView, openUpdateTargetSchemaPanelView } from '../../core/state/PanelSlice';
import type { AppDispatch, RootState } from '../../core/state/Store';
import { LogCategory, LogService } from '../../utils/Logging.Utils';
import type { IChoiceGroupOption } from '@fluentui/react';
import { ChoiceGroup, IconButton, Label, Stack, StackItem, Text } from '@fluentui/react';
import { useId } from '@microsoft/designer-ui';
import { SchemaType } from '@microsoft/logic-apps-shared';
import { useCallback } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';

export interface DefaultConfigViewProps {
  setFunctionDisplayExpanded: (isFunctionDisplaySimple: boolean) => void;
  useExpandedFunctionCards: boolean;
}

export const DefaultConfigView = ({ setFunctionDisplayExpanded, useExpandedFunctionCards }: DefaultConfigViewProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const intl = useIntl();

  const sourceSchema = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.sourceSchema);
  const targetSchema = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.targetSchema);

  const schemasSectionTitleLoc = intl.formatMessage({
    defaultMessage: 'Schemas',
    id: 'xC1zg3',
    description: 'Section header for the schema section',
  });

  const schemasSectionDescLoc = intl.formatMessage({
    defaultMessage: 'Add or replace your schemas.',
    id: 'TY4HzZ',
    description: 'Description for the schema section',
  });

  const sourceSchemaLabel = intl.formatMessage({
    defaultMessage: 'Source schema',
    id: 'UnrrzF',
    description: 'Label to inform the below schema name is for source schema',
  });

  const targetSchemaLabel = intl.formatMessage({
    defaultMessage: 'Target schema',
    id: 'jUDhbs',
    description: 'Label to inform the below schema name is for target schema',
  });

  const noSchemaAddedLoc = intl.formatMessage({
    defaultMessage: 'No schema is added.',
    id: 'nNWAAh',
    description: 'Placeholder when no schema has been added',
  });

  const pencilIconLoc = intl.formatMessage({
    defaultMessage: 'Pencil icon',
    id: 'QdJUaS',
    description: 'Pencil icon aria label',
  });

  const functionsSectionTitleLoc = intl.formatMessage({
    defaultMessage: 'Functions',
    id: 'lR7V87',
    description: 'Section header for the functions section',
  });

  const functionsSectionDescriptionLoc = intl.formatMessage({
    defaultMessage: 'Modify options regarding functions',
    id: 'GyUe4C',
    description: 'Description for the functions section',
  });

  const functionDisplayLoc = intl.formatMessage({
    defaultMessage: 'Function display',
    id: '+0yxlR',
    description: 'Label for the function display radio group',
  });

  const functionDisplaySimpleLoc = intl.formatMessage({
    defaultMessage: 'Simple',
    id: 'tAeKNh',
    description: 'Function display radio group option for simple',
  });

  const functionDisplayExpandedLoc = intl.formatMessage({
    defaultMessage: 'Expanded',
    id: 'GD3m4X',
    description: 'Function display radio group option for expanded',
  });

  const onEditSchemaClick = (schemaType: SchemaType) => {
    if (schemaType === SchemaType.Source) {
      dispatch(openUpdateSourceSchemaPanelView());
    } else {
      dispatch(openUpdateTargetSchemaPanelView());
    }
  };

  const functionDisplayLabelId = useId();
  const functionDisplayOptions: IChoiceGroupOption[] = [
    { key: 'simple', text: functionDisplaySimpleLoc },
    { key: 'expanded', text: functionDisplayExpandedLoc },
  ];
  const choiceGroupOnChange = useCallback(
    (_event?: any, option?: IChoiceGroupOption) => {
      if (option) {
        LogService.log(LogCategory.FunctionUtils, 'choiceGroupOnChange', {
          message: `Changing function style: ${option.key}`,
        });

        setFunctionDisplayExpanded(option.key === 'expanded');
      }
    },
    [setFunctionDisplayExpanded]
  );

  return (
    <>
      <Stack
        tokens={{
          childrenGap: 's1',
          padding: 's1',
        }}
      >
        <StackItem>
          <Text block={true} variant="xLarge">
            {schemasSectionTitleLoc}
          </Text>
          <Text>{schemasSectionDescLoc}</Text>
        </StackItem>
        <StackItem>
          <div style={{ display: 'flex' }}>
            <Text className="subsection-label-text">{sourceSchemaLabel}</Text>
            <IconButton
              iconProps={{ iconName: 'Edit' }}
              title={pencilIconLoc}
              ariaLabel={pencilIconLoc}
              onClick={() => onEditSchemaClick(SchemaType.Source)}
            />
          </div>
          <div>{sourceSchema?.name ?? noSchemaAddedLoc}</div>
        </StackItem>
        <StackItem>
          <div style={{ display: 'flex' }}>
            <Text className="subsection-label-text">{targetSchemaLabel}</Text>
            <IconButton
              iconProps={{ iconName: 'Edit' }}
              title={pencilIconLoc}
              ariaLabel={pencilIconLoc}
              onClick={() => onEditSchemaClick(SchemaType.Target)}
            />
          </div>
          <div>{targetSchema?.name ?? noSchemaAddedLoc}</div>
        </StackItem>
      </Stack>
      <Stack
        tokens={{
          childrenGap: 's1',
          padding: 's1',
        }}
      >
        <StackItem>
          <Text block={true} variant="xLarge">
            {functionsSectionTitleLoc}
          </Text>
          <Text>{functionsSectionDescriptionLoc}</Text>
        </StackItem>
        <StackItem>
          <Label id={functionDisplayLabelId} className="subsection-label-text">
            {functionDisplayLoc}
          </Label>
          <ChoiceGroup
            ariaLabelledBy={functionDisplayLabelId}
            defaultSelectedKey={useExpandedFunctionCards ? 'expanded' : 'simple'}
            options={functionDisplayOptions}
            onChange={choiceGroupOnChange}
          />
        </StackItem>
      </Stack>
    </>
  );
};
