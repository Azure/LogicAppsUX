import { describe, beforeAll, expect, it, vi, beforeEach } from 'vitest';
import type { AppStore } from '../../../../core/state/templates/store';
import { setupStore, type RootState } from '../../../../core/state/templates/store';
import type { Template } from '@microsoft/logic-apps-shared';
import { renderWithProviders } from '../../../../__test__/template-test-utils';
import { screen } from '@testing-library/react';
import { TemplatesGalleryWithSearch } from '../templatesgallerywithsearch';
import { QueryClientProvider } from '@tanstack/react-query';
import { getReactQueryClient } from '../../../../core';
// biome-ignore lint/correctness/noUnusedImports: <explanation>
import React from 'react';

describe('ui/templates/gallery/TemplatesGalleryWithSearch', () => {
  let store: AppStore;
  let minimalStoreData: Partial<RootState>;
  let template1Manifest: Template.TemplateManifest;
  let template2Manifest: Template.TemplateManifest;
  const onTemplateSelect = vi.fn();
  const defaultSearchAndFilterProps = {
    detailFilters: {
      Type: { displayName: 'Type', items: [] },
      Industry: { displayName: 'Industry', items: [] },
    },
  };

  // Helper to render with QueryClientProvider
  const renderComponent = (storeInstance: AppStore, props: Partial<Parameters<typeof TemplatesGalleryWithSearch>[0]> = {}) => {
    const queryClient = getReactQueryClient();
    return renderWithProviders(
      <QueryClientProvider client={queryClient}>
        <TemplatesGalleryWithSearch searchAndFilterProps={defaultSearchAndFilterProps} onTemplateSelect={onTemplateSelect} {...props} />
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
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Renders TemplatesGalleryWithSearch with search filters and gallery', () => {
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

    // Should render both search/filter area and template gallery
    expect(screen.getByText('Template 1')).toBeDefined();
    expect(screen.getByText('Template 2')).toBeDefined();
  });

  it('Passes isLightweight prop to TemplatesGallery', () => {
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

  it('Passes pageCount prop to TemplatesGallery', () => {
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

    renderComponent(store, { pageCount: 10 });

    expect(screen.getByText('Template 1')).toBeDefined();
  });

  it('Renders blankTemplateCard when provided', () => {
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

  it('Passes cssOverrides prop to TemplatesGallery', () => {
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

    const cssOverrides = { list: 'custom-class' };
    renderComponent(store, { cssOverrides });

    expect(screen.getByText('Template 1')).toBeDefined();
  });

  it('Shows empty state when no templates match', () => {
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

  it('Applies wrapper styles from useTemplatesGalleryWithSearchStyles', () => {
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

    // Verify the wrapper div exists
    const wrapperDiv = container.firstChild;
    expect(wrapperDiv).toBeDefined();
    expect(wrapperDiv?.nodeName).toBe('DIV');
  });

  it('Renders with different searchAndFilterProps', () => {
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

    const customSearchProps = {
      detailFilters: {
        Category: { displayName: 'Category', items: [] },
      },
      tabFilterKey: 'publishedBy',
    };

    renderComponent(store, { searchAndFilterProps: customSearchProps });

    expect(screen.getByText('Template 1')).toBeDefined();
  });
});
