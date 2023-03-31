import type { PickerProps } from './picker';
import { Picker } from './picker';
import type { IBreadcrumbItem } from '@fluentui/react';
import { DefaultButton, mergeStyleSets, FontWeights } from '@fluentui/react';
import { useBoolean, useId } from '@fluentui/react-hooks';
import type { ComponentMeta, ComponentStory } from '@storybook/react';

export default {
  component: Picker,
  title: 'Components/Picker',
} as ComponentMeta<typeof Picker>;

const styles = mergeStyleSets({
  button: {
    width: 130,
  },
  callout: {
    width: 320,
    maxWidth: '90%',
    padding: '20px 24px',
  },
  title: {
    marginBottom: 12,
    fontWeight: FontWeights.semilight,
  },
  link: {
    display: 'block',
    marginTop: 20,
  },
});

function _onBreadcrumbItemClicked(ev?: React.MouseEvent<HTMLElement>, item?: IBreadcrumbItem): void {
  console.log(`Breadcrumb item with key "${item?.key}" has been clicked.`);
}

const items: IBreadcrumbItem[] = [
  { text: 'Files', key: 'Files', onClick: _onBreadcrumbItemClicked },
  { text: 'Folder', key: 'f1', onClick: _onBreadcrumbItemClicked },
  { text: 'Folder 1', key: 'f1', onClick: _onBreadcrumbItemClicked },
  { text: 'Folder 2', key: 'f11', onClick: _onBreadcrumbItemClicked, isCurrentItem: true },
];

const WrapperItem = (props: PickerProps) => {
  const [isCalloutVisible, { toggle: toggleIsCalloutVisible }] = useBoolean(false);
  const buttonId = useId('callout-button');

  return (
    <>
      <DefaultButton
        id={buttonId}
        onClick={toggleIsCalloutVisible}
        text={isCalloutVisible ? 'Hide callout' : 'Show callout'}
        className={styles.button}
      />
      {isCalloutVisible && <Picker {...props} onCancel={toggleIsCalloutVisible} anchorId={buttonId} />}
    </>
  );
};
export const ListOfFiles: ComponentStory<typeof Picker> = (args: PickerProps) => <WrapperItem {...args} />;
ListOfFiles.args = {
  visible: true,
  currentPathSegments: items,
  loadingFiles: false,
  files: [
    {
      text: 'App',
      type: 'folder',
    },
    {
      text: 'Desktop',
      type: 'folder',
    },
    {
      text: 'Documents',
      type: 'folder',
    },
    {
      text: 'Downloads',
      type: 'folder',
    },
    {
      text: 'Photos',
      type: 'folder',
    },
    {
      text: 'Index.html',
      type: 'file',
    },
  ],
};

export const NextFilesLoading: ComponentStory<typeof Picker> = (args: PickerProps) => <WrapperItem {...args} />;
NextFilesLoading.args = {
  ...ListOfFiles.args,
  loadingFiles: true,
};
