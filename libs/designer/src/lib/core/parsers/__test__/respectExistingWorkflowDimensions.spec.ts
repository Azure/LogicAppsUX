import { flattenWorkflowNodes, updateChildrenDimensions } from '../ParseReduxAction';
import type { WorkflowNode } from '../models/workflowNode';
import { describe, vi, beforeEach, afterEach, beforeAll, afterAll, it, test, expect } from 'vitest';
describe('respect existing workflow dimensions', () => {
  const simpleFlow: WorkflowNode[] = [
    {
      id: 'When_a_new_email_arrives',
      width: 200,
      height: 88,
      type: 'OPERATION_NODE',
    },
    {
      id: 'Get_my_profile',
      width: 200,
      height: 68,
      type: 'OPERATION_NODE',
    },
    {
      id: 'Send_an_email',
      width: 200,
      height: 68,
      type: 'OPERATION_NODE',
    },
  ];

  const recursiveFlow: WorkflowNode[] = [
    {
      id: 'When_a_new_email_arrives',
      width: 200,
      height: 40,
      type: 'OPERATION_NODE',
    },
    {
      id: 'Condition',
      width: 200,
      height: 40,
      type: 'GRAPH_NODE',
      children: [
        {
          id: 'Condition-#scope',
          width: 200,
          height: 40,
          type: 'SCOPE_CARD_NODE',
        },
        {
          id: 'Condition-actions',
          children: [
            {
              id: 'Condition-actions-#subgraph',
              width: 200,
              height: 40,
              type: 'SUBGRAPH_CARD_NODE',
            },
            {
              id: 'Create_file',
              width: 200,
              height: 40,
              type: 'OPERATION_NODE',
            },
            {
              id: 'Get_my_profile',
              width: 200,
              height: 40,
              type: 'OPERATION_NODE',
            },
            {
              id: 'Post_message_in_a_chat_or_channel',
              width: 200,
              height: 40,
              type: 'OPERATION_NODE',
            },
          ],
          edges: [
            {
              id: 'Create_file-Get_my_profile',
              source: 'Create_file',
              target: 'Get_my_profile',
              type: 'BUTTON_EDGE',
            },
            {
              id: 'Get_my_profile-Post_message_in_a_chat_or_channel',
              source: 'Get_my_profile',
              target: 'Post_message_in_a_chat_or_channel',
              type: 'BUTTON_EDGE',
            },
            {
              id: 'Condition-actions-#subgraph-Create_file',
              source: 'Condition-actions-#subgraph',
              target: 'Create_file',
              type: 'HEADING_EDGE',
            },
          ],
          type: 'SUBGRAPH_NODE',
          subGraphLocation: 'actions',
        },
        {
          id: 'Condition-elseActions',
          children: [
            {
              id: 'Condition-elseActions-#subgraph',
              width: 200,
              height: 40,
              type: 'SUBGRAPH_CARD_NODE',
            },
          ],
          edges: [],
          type: 'SUBGRAPH_NODE',
          subGraphLocation: 'else',
        },
      ],
      edges: [
        {
          id: 'Condition-#scope-Condition-actions',
          source: 'Condition-#scope',
          target: 'Condition-actions',
          type: 'ONLY_EDGE',
        },
        {
          id: 'Condition-#scope-Condition-elseActions',
          source: 'Condition-#scope',
          target: 'Condition-elseActions',
          type: 'ONLY_EDGE',
        },
      ],
    },
  ];

  it('should flatten a simple workflow', () => {
    const result = flattenWorkflowNodes(simpleFlow);
    expect(result).toEqual(simpleFlow);
  });

  it('should flatten a nested workflow', () => {
    const result = flattenWorkflowNodes(recursiveFlow);
    expect(result).toEqual([
      {
        id: 'When_a_new_email_arrives',
        width: 200,
        height: 40,
        type: 'OPERATION_NODE',
      },
      {
        id: 'Condition-#scope',
        width: 200,
        height: 40,
        type: 'SCOPE_CARD_NODE',
      },
      {
        id: 'Condition-actions-#subgraph',
        width: 200,
        height: 40,
        type: 'SUBGRAPH_CARD_NODE',
      },
      {
        id: 'Create_file',
        width: 200,
        height: 40,
        type: 'OPERATION_NODE',
      },
      {
        id: 'Get_my_profile',
        width: 200,
        height: 40,
        type: 'OPERATION_NODE',
      },
      {
        id: 'Post_message_in_a_chat_or_channel',
        width: 200,
        height: 40,
        type: 'OPERATION_NODE',
      },
      {
        id: 'Condition-actions',
        edges: [
          {
            id: 'Create_file-Get_my_profile',
            source: 'Create_file',
            target: 'Get_my_profile',
            type: 'BUTTON_EDGE',
          },
          {
            id: 'Get_my_profile-Post_message_in_a_chat_or_channel',
            source: 'Get_my_profile',
            target: 'Post_message_in_a_chat_or_channel',
            type: 'BUTTON_EDGE',
          },
          {
            id: 'Condition-actions-#subgraph-Create_file',
            source: 'Condition-actions-#subgraph',
            target: 'Create_file',
            type: 'HEADING_EDGE',
          },
        ],
        type: 'SUBGRAPH_NODE',
        subGraphLocation: 'actions',
      },
      {
        id: 'Condition-elseActions-#subgraph',
        width: 200,
        height: 40,
        type: 'SUBGRAPH_CARD_NODE',
      },
      {
        id: 'Condition-elseActions',
        edges: [],
        type: 'SUBGRAPH_NODE',
        subGraphLocation: 'else',
      },
      {
        id: 'Condition',
        width: 200,
        height: 40,
        type: 'GRAPH_NODE',
        edges: [
          {
            id: 'Condition-#scope-Condition-actions',
            source: 'Condition-#scope',
            target: 'Condition-actions',
            type: 'ONLY_EDGE',
          },
          {
            id: 'Condition-#scope-Condition-elseActions',
            source: 'Condition-#scope',
            target: 'Condition-elseActions',
            type: 'ONLY_EDGE',
          },
        ],
      },
    ]);
  });

  it('should handle empty input', () => {
    const nodes: WorkflowNode[] = [];
    const result = flattenWorkflowNodes(nodes);
    expect(result).toEqual([]);
  });

  it('should handle input with only root node', () => {
    const nodes: WorkflowNode[] = [
      {
        id: 'When_a_new_email_arrives',
        width: 200,
        height: 88,
        type: 'OPERATION_NODE',
      },
    ];
    const result = flattenWorkflowNodes(nodes);
    expect(result).toEqual(nodes);
  });

  it('should update the dimensions of currentChildren based on previousChildren', () => {
    const currentChildren: WorkflowNode[] = [
      {
        id: 'When_a_new_email_arrives',
        width: 200,
        height: 40,
        type: 'OPERATION_NODE',
      },
      {
        id: 'Get_my_profile',
        width: 200,
        height: 40,
        type: 'OPERATION_NODE',
      },
      {
        id: 'Post_message_in_a_chat_or_channel',
        width: 200,
        height: 40,
        type: 'OPERATION_NODE',
      },
    ];
    updateChildrenDimensions(currentChildren, simpleFlow);
    expect(currentChildren).toEqual([
      {
        id: 'When_a_new_email_arrives',
        width: 200,
        height: 88,
        type: 'OPERATION_NODE',
      },
      {
        id: 'Get_my_profile',
        width: 200,
        height: 68,
        type: 'OPERATION_NODE',
      },
      {
        id: 'Post_message_in_a_chat_or_channel',
        width: 200,
        height: 40,
        type: 'OPERATION_NODE',
      },
    ]);
  });

  it('should not update the dimensions of currentChildren if previousChildren does not have the same id', () => {
    const currentChildren: WorkflowNode[] = [
      {
        id: 'Id_1',
        width: 200,
        height: 40,
        type: 'OPERATION_NODE',
      },
      {
        id: 'Id_2',
        width: 200,
        height: 40,
        type: 'OPERATION_NODE',
      },
      {
        id: 'Id_3',
        width: 200,
        height: 40,
        type: 'OPERATION_NODE',
      },
    ];
    updateChildrenDimensions(currentChildren, simpleFlow);
    expect(currentChildren).toEqual([
      {
        id: 'Id_1',
        width: 200,
        height: 40,
        type: 'OPERATION_NODE',
      },
      {
        id: 'Id_2',
        width: 200,
        height: 40,
        type: 'OPERATION_NODE',
      },
      {
        id: 'Id_3',
        width: 200,
        height: 40,
        type: 'OPERATION_NODE',
      },
    ]);
  });

  it('should update the dimensions of currentChildren recursively', () => {
    const previousChildren: WorkflowNode[] = [
      {
        id: 'Condition-actions-#subgraph',
        width: 200,
        height: 28,
        type: 'SUBGRAPH_CARD_NODE',
      },
      {
        id: 'Create_file',
        width: 200,
        height: 68,
        type: 'OPERATION_NODE',
      },
      {
        id: 'Get_my_profile',
        width: 200,
        height: 68,
        type: 'OPERATION_NODE',
      },
      {
        id: 'Post_message_in_a_chat_or_channel',
        width: 200,
        height: 88,
        type: 'OPERATION_NODE',
      },
    ];
    updateChildrenDimensions(recursiveFlow, previousChildren);
    expect(recursiveFlow).toEqual([
      {
        id: 'When_a_new_email_arrives',
        width: 200,
        height: 40,
        type: 'OPERATION_NODE',
      },
      {
        id: 'Condition',
        width: 200,
        height: 40,
        type: 'GRAPH_NODE',
        children: [
          {
            id: 'Condition-#scope',
            width: 200,
            height: 40,
            type: 'SCOPE_CARD_NODE',
          },
          {
            id: 'Condition-actions',
            children: [
              {
                id: 'Condition-actions-#subgraph',
                width: 200,
                height: 28,
                type: 'SUBGRAPH_CARD_NODE',
              },
              {
                id: 'Create_file',
                width: 200,
                height: 68,
                type: 'OPERATION_NODE',
              },
              {
                id: 'Get_my_profile',
                width: 200,
                height: 68,
                type: 'OPERATION_NODE',
              },
              {
                id: 'Post_message_in_a_chat_or_channel',
                width: 200,
                height: 88,
                type: 'OPERATION_NODE',
              },
            ],
            edges: [
              {
                id: 'Create_file-Get_my_profile',
                source: 'Create_file',
                target: 'Get_my_profile',
                type: 'BUTTON_EDGE',
              },
              {
                id: 'Get_my_profile-Post_message_in_a_chat_or_channel',
                source: 'Get_my_profile',
                target: 'Post_message_in_a_chat_or_channel',
                type: 'BUTTON_EDGE',
              },
              {
                id: 'Condition-actions-#subgraph-Create_file',
                source: 'Condition-actions-#subgraph',
                target: 'Create_file',
                type: 'HEADING_EDGE',
              },
            ],
            type: 'SUBGRAPH_NODE',
            subGraphLocation: 'actions',
          },
          {
            id: 'Condition-elseActions',
            children: [
              {
                id: 'Condition-elseActions-#subgraph',
                width: 200,
                height: 40,
                type: 'SUBGRAPH_CARD_NODE',
              },
            ],
            edges: [],
            type: 'SUBGRAPH_NODE',
            subGraphLocation: 'else',
          },
        ],
        edges: [
          {
            id: 'Condition-#scope-Condition-actions',
            source: 'Condition-#scope',
            target: 'Condition-actions',
            type: 'ONLY_EDGE',
          },
          {
            id: 'Condition-#scope-Condition-elseActions',
            source: 'Condition-#scope',
            target: 'Condition-elseActions',
            type: 'ONLY_EDGE',
          },
        ],
      },
    ]);
  });
});
