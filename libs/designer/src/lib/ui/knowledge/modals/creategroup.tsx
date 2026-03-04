import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  DialogTrigger,
  Text,
  Field,
  Input,
  Textarea,
} from '@fluentui/react-components';
import { useIntl } from 'react-intl';
import { Dismiss24Regular } from '@fluentui/react-icons';
import { useCallback, useState } from 'react';
import { createKnowledgeHub } from '../../../core/knowledge/utils/helper';

export const CreateGroup = ({
  resourceId,
  onDismiss,
  onCreate,
}: { resourceId: string; onDismiss: () => void; onCreate?: (groupName: string) => void }) => {
  const intl = useIntl();
  const INTL_TEXT = {
    title: intl.formatMessage({
      defaultMessage: 'Create a new group',
      id: '4eYp8/',
      description: 'Title for the create group modal',
    }),
    subtitle: intl.formatMessage({
      defaultMessage: 'Provide details to create a new group.',
      id: 'fFhnXC',
      description: 'Subtitle for the create group modal',
    }),
    nameLabel: intl.formatMessage({
      defaultMessage: 'Name',
      id: 'SOqf2M',
      description: 'Label for the group name input field',
    }),
    namePlaceholder: intl.formatMessage({
      defaultMessage: 'Enter a group name',
      id: 'yGPRus',
      description: 'Placeholder for the group name input field',
    }),
    descriptionLabel: intl.formatMessage({
      defaultMessage: 'Description',
      id: 'Cb02hn',
      description: 'Label for the group description input field',
    }),
    descriptionPlaceholder: intl.formatMessage({
      defaultMessage: 'Enter a description',
      id: 'gcn3Jg',
      description: 'Placeholder for the group description input field',
    }),
    createButton: intl.formatMessage({
      defaultMessage: 'Create',
      id: '9gb/xS',
      description: 'Button text for creating a group',
    }),
    cancelButton: intl.formatMessage({
      defaultMessage: 'Cancel',
      id: '59OCrz',
      description: 'Button text for canceling group creation',
    }),
  };

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleCreate = useCallback(async () => {
    await createKnowledgeHub(resourceId, name, description);

    onCreate?.(name);
    onDismiss();
  }, [description, name, onCreate, onDismiss, resourceId]);

  const handleCancel = useCallback(() => {
    onDismiss();
  }, [onDismiss]);

  return (
    <Dialog open={true} onOpenChange={onDismiss}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle
            action={
              <DialogTrigger action="close">
                <Button appearance="subtle" aria-label="close" icon={<Dismiss24Regular />} />
              </DialogTrigger>
            }
          >
            {INTL_TEXT.title}
          </DialogTitle>
          <DialogContent>
            <Text>{INTL_TEXT.subtitle}</Text>
            <br />
            <Field label={INTL_TEXT.nameLabel} required={true}>
              <Input placeholder={INTL_TEXT.namePlaceholder} value={name} onChange={(_, v) => setName(v.value)} />
            </Field>
            <Field label={INTL_TEXT.descriptionLabel}>
              <Textarea placeholder={INTL_TEXT.descriptionPlaceholder} value={description} onChange={(_, v) => setDescription(v.value)} />
            </Field>
          </DialogContent>
          <DialogActions>
            <DialogTrigger disableButtonEnhancement>
              <Button appearance="primary" disabled={!name} onClick={handleCreate}>
                {INTL_TEXT.createButton}
              </Button>
            </DialogTrigger>
            <DialogTrigger disableButtonEnhancement>
              <Button onClick={handleCancel}>{INTL_TEXT.cancelButton}</Button>
            </DialogTrigger>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};
