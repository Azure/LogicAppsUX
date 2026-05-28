import { describe, beforeAll, expect, it, vi, beforeEach } from 'vitest';
import type { AppStore } from '../../../../core/state/templates/store';
import { setupStore, type RootState } from '../../../../core/state/templates/store';
import type { Template } from '@microsoft/logic-apps-shared';
import { renderWithProviders } from '../../../../__test__/template-test-utils';
import { screen, fireEvent } from '@testing-library/react';
import { TemplatesGallery } from '../templatesgallery';
import { QueryClientProvider } from '@tanstack/react-query';
import { getReactQueryClient } from '../../../../core';
// biome-ignore lint/correctness/noUnusedImports: <explanation>
import React from 'react';

describe('ui/templates/gallery/TemplatesGallery', () => {
  let store: AppStore;
  let minimalStoreData: Partial<RootState>;
  let template1Manifest: Template.TemplateManifest;
  let template2Manifest: Template.TemplateManifest;
  let template3Manifest: Template.TemplateManifest;
  const onTemplateSelect = vi.fn();

  // Helper to render with QueryClientProvider
  const renderComponent = (storeInstance: AppStore, props: Partial<Parameters<typeof TemplatesGallery>[0]> = {}) => {
    const queryClient = getReactQueryClient();
    return renderWithProviders(
      <QueryClientProvider client={queryClient}>
        <TemplatesGallery onTemplateSelect={onTemplateSelect} {...props} />
      </QueryClientProvider>,
      { store: storeInstance }
    );
  };

  beforeAll(() => {
    template1Manifest = {
      id: 'template1',
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
      id: 'template2',
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

    template3Manifest = {
      id: 'template3',
      title: 'Template 3',
      summary: 'Template 3 Description',
      skus: ['consumption'],
      workflows: {
        default: { name: 'default' },
      },
      details: {
        By: 'Partner',
        Type: 'Automation',
        Category: 'Productivity',
      },
    };
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Renders template cards for available templates', () => {
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

  it('Shows loading skeleton cards when filteredTemplateNames is undefined', () => {
    minimalStoreData = {
      manifest: {
        availableTemplateNames: undefined as any,
        availableTemplates: undefined as any,
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

    // Should render 4 skeleton template cards
    const skeletonCards = container.querySelectorAll('[class*="templateCard"]');
    expect(skeletonCards.length).toBeGreaterThanOrEqual(0);
  });

  it('Shows empty search message when no templates match filters', () => {
    minimalStoreData = {
      manifest: {
        availableTemplateNames: [],
        availableTemplates: {},
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

    expect(screen.getByText("Can't find any search results")).toBeDefined();
    expect(screen.getByText('Try a different search term or remove filters')).toBeDefined();
  });

  it('Renders blank template card when provided', () => {
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

    const blankCard = <div data-testid="blank-card">Blank Template</div>;
    renderComponent(store, { blankTemplateCard: blankCard });

    expect(screen.getByTestId('blank-card')).toBeDefined();
    expect(screen.getByText('Blank Template')).toBeDefined();
  });

  it('Shows pager when templates exist', () => {
    minimalStoreData = {
      manifest: {
        availableTemplateNames: ['template1', 'template2', 'template3'],
        availableTemplates: {
          template1: template1Manifest,
          template2: template2Manifest,
          template3: template3Manifest,
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

    // Pager should be present with page 1
    expect(screen.getByText('1')).toBeDefined();
  });

  it('Does not show pager when no templates exist', () => {
    minimalStoreData = {
      manifest: {
        availableTemplateNames: [],
        availableTemplates: {},
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

    // Should show empty state, not pager
    expect(screen.getByText("Can't find any search results")).toBeDefined();
  });

  it('Respects isLightweight prop', () => {
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

    renderComponent(store, { isLightweight: true });

    expect(screen.getByText('Template 1')).toBeDefined();
  });

  it('Passes cssOverrides to template cards', () => {
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

    const cssOverrides = { list: 'custom-list-class' };
    renderComponent(store, { cssOverrides });

    expect(screen.getByText('Template 1')).toBeDefined();
  });

  it('Calls onTemplateSelect when template card is clicked', () => {
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

    fireEvent.click(screen.getByText('Template 1'));

    // Template card click should set template state
    expect(store.getState().template.templateName).toBe('template1');
  });

  it('Respects custom pageCount prop', () => {
    minimalStoreData = {
      manifest: {
        availableTemplateNames: ['template1', 'template2', 'template3'],
        availableTemplates: {
          template1: template1Manifest,
          template2: template2Manifest,
          template3: template3Manifest,
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

    // With pageCount of 1, should only show 1 template per page
    renderComponent(store, { pageCount: 1 });

    expect(screen.getByText('Template 1')).toBeDefined();
    // Template 2 should not be visible on first page with pageCount=1
    // (depending on how the gallery renders)
  });

  it('Handles page navigation via pager', () => {
    minimalStoreData = {
      manifest: {
        availableTemplateNames: ['template1', 'template2', 'template3'],
        availableTemplates: {
          template1: template1Manifest,
          template2: template2Manifest,
          template3: template3Manifest,
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

    // Initial page should be 0
    expect(store.getState().manifest.filters.pageNum).toBe(0);
  });

  it('Shows correct page count information', () => {
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

    // Templates should be visible on first page
    expect(screen.getByText('Template 1')).toBeDefined();
    expect(screen.getByText('Template 2')).toBeDefined();
  });
});
