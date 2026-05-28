import { describe, beforeAll, expect, it, vi, beforeEach } from 'vitest';
import type { AppStore } from '../../../../core/state/templates/store';
import { setupStore, type RootState } from '../../../../core/state/templates/store';
import type { Template } from '@microsoft/logic-apps-shared';
import { renderWithProviders } from '../../../../__test__/template-test-utils';
import { screen, fireEvent } from '@testing-library/react';
import { TemplatesFullGalleryView } from '../templatesfullgalleryview';
import { TemplatePanelView } from '../../../../core/state/templates/panelSlice';
import { QueryClientProvider } from '@tanstack/react-query';
import { getReactQueryClient } from '../../../../core';
// biome-ignore lint/correctness/noUnusedImports: <explanation>
import React from 'react';

describe('ui/templates/gallery/TemplatesFullGalleryView', () => {
  let store: AppStore;
  let minimalStoreData: Partial<RootState>;
  let template1Manifest: Template.TemplateManifest;
  let template2Manifest: Template.TemplateManifest;
  let workflow1Manifest: Template.WorkflowManifest;
  const createWorkflowCall = vi.fn();
  const defaultDetailFilters = {
    Type: { displayName: 'Type', items: [] },
    Industry: { displayName: 'Industry', items: [] },
  };

  // Helper to render with QueryClientProvider
  const renderComponent = (storeInstance: AppStore) => {
    const queryClient = getReactQueryClient();
    return renderWithProviders(
      <QueryClientProvider client={queryClient}>
        <TemplatesFullGalleryView detailFilters={defaultDetailFilters} createWorkflowCall={createWorkflowCall} isWorkflowEmpty={true} />
      </QueryClientProvider>,
      { store: storeInstance }
    );
  };

  const renderComponentWithProps = (storeInstance: AppStore, isWorkflowEmpty: boolean) => {
    const queryClient = getReactQueryClient();
    return renderWithProviders(
      <QueryClientProvider client={queryClient}>
        <TemplatesFullGalleryView
          detailFilters={defaultDetailFilters}
          createWorkflowCall={createWorkflowCall}
          isWorkflowEmpty={isWorkflowEmpty}
        />
      </QueryClientProvider>,
      { store: storeInstance }
    );
  };

  beforeAll(() => {
    template1Manifest = {
      id: 'template1Manifest',
      title: 'Template 1',
      summary: 'Template 1 Description',
      skus: ['standard', 'consumption'],
      workflows: {
        default: { name: 'default' },
      },
      details: {
        By: 'Microsoft',
        Type: 'Automation',
        Category: 'Productivity',
      },
    };

    template2Manifest = {
      id: 'template2Manifest',
      title: 'Template 2',
      summary: 'Template 2 Description',
      skus: ['standard'],
      workflows: {
        default: { name: 'default' },
      },
      details: {
        By: 'Microsoft',
        Type: 'Integration',
        Category: 'Business',
      },
    };

    workflow1Manifest = {
      id: 'default',
      title: 'Template 1 Workflow',
      summary: 'Template 1 Workflow Description',
      kinds: ['stateful', 'stateless'],
      artifacts: [{ type: 'workflow', file: 'workflow.json' }],
      images: { light: '', dark: '' },
      connections: {},
      parameters: [],
    };
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Renders TemplatesFullGalleryView with gallery and search components', () => {
    minimalStoreData = {
      manifest: {
        availableTemplateNames: ['template1', 'template2'],
        availableTemplates: {
          template1: template1Manifest,
          template2: template2Manifest,
        },
        filters: {
          sortKey: 'a-to-z',
          connectors: undefined,
          detailFilters: {},
          pageNum: 0,
        },
      },
    };
    store = setupStore(minimalStoreData);

    renderComponent(store);

    expect(screen.getByText('Template 1')).toBeDefined();
    expect(screen.getByText('Template 2')).toBeDefined();
  });

  it('Shows blank template card when no tab filter is applied', () => {
    minimalStoreData = {
      manifest: {
        availableTemplateNames: ['template1'],
        availableTemplates: {
          template1: template1Manifest,
        },
        filters: {
          sortKey: 'a-to-z',
          connectors: undefined,
          detailFilters: {},
          pageNum: 0,
        },
      },
    };
    store = setupStore(minimalStoreData);

    renderComponent(store);

    expect(screen.queryByLabelText('Blank workflow')).toBeDefined();
  });

  it('Hides blank template card when publishedBy tab filter is applied', () => {
    minimalStoreData = {
      manifest: {
        availableTemplateNames: ['template1'],
        availableTemplates: {
          template1: template1Manifest,
        },
        filters: {
          sortKey: 'a-to-z',
          connectors: undefined,
          detailFilters: {
            publishedBy: [{ value: 'Microsoft', displayName: 'Microsoft' }],
          },
          pageNum: 0,
        },
      },
    };
    store = setupStore(minimalStoreData);

    renderComponent(store);

    expect(screen.queryByLabelText('Blank workflow')).toBeNull();
  });

  it('Opens QuickView panel when a single workflow template is selected', () => {
    minimalStoreData = {
      manifest: {
        availableTemplateNames: ['template1'],
        availableTemplates: {
          template1: template1Manifest,
        },
        filters: {
          sortKey: 'a-to-z',
          connectors: undefined,
          detailFilters: {},
          pageNum: 0,
        },
      },
      panel: {
        isOpen: false,
        currentPanelView: undefined,
        selectedTabId: undefined,
      },
    };
    store = setupStore(minimalStoreData);

    renderComponent(store);

    // Click on template card
    fireEvent.click(screen.getByText('Template 1'));

    // Verify panel is opened with QuickView
    expect(store.getState().panel.isOpen).toBe(true);
    expect(store.getState().panel.currentPanelView).toBe(TemplatePanelView.QuickView);
  });

  it('Does not render WorkflowView when no template is selected', () => {
    minimalStoreData = {
      manifest: {
        availableTemplateNames: ['template1'],
        availableTemplates: {
          template1: template1Manifest,
        },
        filters: {
          sortKey: 'a-to-z',
          connectors: undefined,
          detailFilters: {},
          pageNum: 0,
        },
      },
      template: {
        templateName: undefined,
        workflows: {},
        manifest: undefined,
        parameterDefinitions: {},
        connections: {},
        errors: {
          manifest: {},
          workflows: {},
          parameters: {},
          connections: undefined,
        },
      },
    };
    store = setupStore(minimalStoreData);

    renderComponent(store);

    // WorkflowView should not render QuickViewPanel when no template is selected
    expect(screen.queryByText('Use this template')).toBeNull();
  });

  it('Renders WorkflowView with panels when single workflow template is selected', () => {
    minimalStoreData = {
      manifest: {
        availableTemplateNames: ['template1'],
        availableTemplates: {
          template1: template1Manifest,
        },
        filters: {
          sortKey: 'a-to-z',
          connectors: undefined,
          detailFilters: {},
          pageNum: 0,
        },
      },
      template: {
        templateName: 'template1',
        workflows: {
          default: {
            id: 'default',
            workflowName: '',
            kind: undefined,
            manifest: workflow1Manifest,
            triggerType: '',
            workflowDefinition: {
              $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
              contentVersion: '',
            },
            errors: { workflow: undefined, kind: undefined },
            connectionKeys: [],
          },
        },
        manifest: template1Manifest,
        parameterDefinitions: {},
        connections: {},
        errors: {
          manifest: {},
          workflows: {},
          parameters: {},
          connections: undefined,
        },
      },
      panel: {
        isOpen: true,
        currentPanelView: TemplatePanelView.QuickView,
        selectedTabId: undefined,
      },
    };
    store = setupStore(minimalStoreData);

    renderComponent(store);

    // WorkflowView should render when single workflow template is selected
    expect(store.getState().template.templateName).toBe('template1');
    expect(Object.keys(store.getState().template.workflows).length).toBe(1);
  });

  it('Does not render WorkflowView for multi-workflow templates', () => {
    const multiWorkflowTemplate: Template.TemplateManifest = {
      id: 'multiTemplate',
      title: 'Multi Workflow Template',
      summary: 'Template with multiple workflows',
      skus: ['standard'],
      workflows: {
        workflow1: { name: 'Workflow 1' },
        workflow2: { name: 'Workflow 2' },
      },
      details: {
        By: 'Microsoft',
        Type: 'Automation',
        Category: 'Productivity',
      },
    };

    minimalStoreData = {
      manifest: {
        availableTemplateNames: ['multiTemplate'],
        availableTemplates: {
          multiTemplate: multiWorkflowTemplate,
        },
        filters: {
          sortKey: 'a-to-z',
          connectors: undefined,
          detailFilters: {},
          pageNum: 0,
        },
      },
      template: {
        templateName: 'multiTemplate',
        workflows: {
          workflow1: {
            id: 'workflow1',
            workflowName: '',
            kind: undefined,
            manifest: workflow1Manifest,
            triggerType: '',
            workflowDefinition: {
              $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
              contentVersion: '',
            },
            errors: { workflow: undefined, kind: undefined },
            connectionKeys: [],
          },
          workflow2: {
            id: 'workflow2',
            workflowName: '',
            kind: undefined,
            manifest: workflow1Manifest,
            triggerType: '',
            workflowDefinition: {
              $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
              contentVersion: '',
            },
            errors: { workflow: undefined, kind: undefined },
            connectionKeys: [],
          },
        },
        manifest: multiWorkflowTemplate,
        parameterDefinitions: {},
        connections: {},
        errors: {
          manifest: {},
          workflows: {},
          parameters: {},
          connections: undefined,
        },
      },
    };
    store = setupStore(minimalStoreData);

    renderComponent(store);

    // WorkflowView should NOT render for multi-workflow templates (workflows.length !== 1)
    expect(Object.keys(store.getState().template.workflows).length).toBe(2);
  });

  it('Respects isWorkflowEmpty prop for blank template card', () => {
    minimalStoreData = {
      manifest: {
        availableTemplateNames: ['template1'],
        availableTemplates: {
          template1: template1Manifest,
        },
        filters: {
          sortKey: 'a-to-z',
          connectors: undefined,
          detailFilters: {},
          pageNum: 0,
        },
      },
    };
    store = setupStore(minimalStoreData);

    renderComponentWithProps(store, false);

    // Blank template card should still be present but with isWorkflowEmpty=false
    expect(screen.queryByLabelText('Blank workflow')).toBeDefined();
  });

  it('Renders layer host element for Fluent UI panels', () => {
    minimalStoreData = {
      manifest: {
        availableTemplateNames: ['template1'],
        availableTemplates: {
          template1: template1Manifest,
        },
        filters: {
          sortKey: 'a-to-z',
          connectors: undefined,
          detailFilters: {},
          pageNum: 0,
        },
      },
    };
    store = setupStore(minimalStoreData);

    const { container } = renderComponent(store);

    const layerHost = container.querySelector('#msla-layer-host');
    expect(layerHost).toBeDefined();
    expect(layerHost?.getAttribute('style')).toContain('visibility: hidden');
  });
});
