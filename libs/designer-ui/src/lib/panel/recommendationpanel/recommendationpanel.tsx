// eslint-disable-next-line @nrwl/nx/enforce-module-boundaries
import { DesignerSearchBox } from '../..';
import { OperationCard } from './card';
import { AutoScroll, List, Panel } from '@fluentui/react';
import { Text } from '@fluentui/react';
// danielle will fix
// eslint-disable-next-line @nrwl/nx/enforce-module-boundaries
import type { CommonPanelProps } from 'libs/designer-ui/src/lib/panel/panelUtil';
import React, { useEffect } from 'react';

export type RecommendationPanelProps = {
  placeholder: string;
  onSearch: (term: string) => void;
  toggleCollapse: () => void;
  operationSearchResults: Operation[];
} & CommonPanelProps;

const getResultCards = (results: Operation[]) => {
  return results.map((operation) => (
    <>
      <OperationCard title={operation.title} key={operation.id} id={operation.id}></OperationCard>
      <div key={operation.id} style={{ height: '60px', border: '1px' }}>
        <Text>{operation.title}</Text>
      </div>
    </>
  ));
};

export const RecommendationPanel = (props: RecommendationPanelProps) => {
  const [searchResults, setSearchResults] = React.useState<JSX.Element[]>([]);
  useEffect(() => setSearchResults(getResultCards(props.operationSearchResults)), [props.operationSearchResults]);
  return (
    <Panel customWidth={props.width} isOpen={!props.isCollapsed} onDismiss={props.toggleCollapse}>
      <DesignerSearchBox name="idk" onSearch={props.onSearch}></DesignerSearchBox>
      <div style={{ overflow: 'auto', height: '500px' }}>
        <List items={searchResults}></List>
      </div>
    </Panel>
  );
};

export interface Operation {
  // Danielle: do we want more data than this?
  brandColor: string;
  connector?: string;
  connectorKind?: string;
  description: string;

  //documentation?: Swagger.ExternalDocumentation;

  environmentBadge?: {
    name: string;
    description: string;
  };
  //externalDocs?: Swagger.ExternalDocumentation;
  iconUri: string;
  id: string;
  important?: boolean;
  operationType?: string;
  premium?: boolean;
  preview?: boolean;
  promotionIndex?: number;
  subtitle?: string;
  title: string;
}
