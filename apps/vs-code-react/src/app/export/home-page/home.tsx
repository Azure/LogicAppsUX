import { DetailsList, Text } from '@fluentui/react';

export const Home: React.FC = () => {
  return (
    <>
      <Text variant="xLarge" className="msla-export-title" nowrap block>
        Select Apps to Export
      </Text>
      <Text variant="large" className="msla-export-title" nowrap block>
        Here you are able to export a selection of Logic Apps into a code format for re-usage and integration into larger Logic App schemas
      </Text>
      <DetailsList
        items={[]}
        columns={[]}
        setKey="set"
        selectionPreservedOnEmptyClick={true}
        ariaLabelForSelectionColumn="Toggle selection"
        ariaLabelForSelectAllCheckbox="Toggle selection for all items"
        checkButtonAriaLabel="select row"
      />
    </>
  );
};
