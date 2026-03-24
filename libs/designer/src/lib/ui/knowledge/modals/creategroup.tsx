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
  Spinner,
} from '@fluentui/react-components';
import { useIntl } from 'react-intl';
import { Dismiss24Regular } from '@fluentui/react-icons';
import { useCallback, useState, useMemo } from 'react';
import { createKnowledgeHub, validateHubNameAvailability } from '../../../core/knowledge/utils/helper';
import { useAllKnowledgeHubs } from '../../../core/knowledge/utils/queries';
import { useModalStyles } from './styles';

export const CreateGroup = ({
  resourceId,
  onDismiss,
  onCreate,
}: { resourceId: string; onDismiss: () => void; onCreate?: (groupName: string, groupDescription: string) => void }) => {
  const styles = useModalStyles();
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
    loadingText: intl.formatMessage({
      defaultMessage: 'Loading...',
      id: 'Z4zCo6',
      description: 'Text displayed while loading existing groups in the create group modal',
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
    creatingButton: intl.formatMessage({
      defaultMessage: 'Creating...',
      id: 'RsXKPH',
      description: 'Button text for creating a group when creation is in progress',
    }),
    cancelButton: intl.formatMessage({
      defaultMessage: 'Cancel',
      id: '59OCrz',
      description: 'Button text for canceling group creation',
    }),
  };

  const { data: hubs, isLoading } = useAllKnowledgeHubs(resourceId);
  const existingGroupNames = useMemo(() => hubs?.map((hub) => hub.name.toLowerCase()) || [], [hubs]);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [nameError, setNameError] = useState<string | undefined>(undefined);
  const [isCreating, setIsCreating] = useState(false);

  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const errorMessage = validateHubNameAvailability(e.target.value, existingGroupNames);
      setName(e.target.value);
      setNameError(errorMessage);
    },
    [existingGroupNames]
  );

  const handleCreate = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsCreating(true);
      await createKnowledgeHub(resourceId, name, description);
      onCreate?.(name, description);
      setIsCreating(false);
    },
    [description, name, onCreate, resourceId]
  );

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
          <DialogContent className={styles.groupContainer}>
            <Text>{INTL_TEXT.subtitle}</Text>
            {isLoading ? (
              <Spinner label={INTL_TEXT.loadingText} size="large" />
            ) : (
              <div className={styles.groupSection}>
                <Field label={INTL_TEXT.nameLabel} required={true} validationMessage={nameError}>
                  <Input placeholder={INTL_TEXT.namePlaceholder} value={name} onChange={handleNameChange} />
                </Field>
                <Field label={INTL_TEXT.descriptionLabel}>
                  <Textarea
                    placeholder={INTL_TEXT.descriptionPlaceholder}
                    value={description}
                    onChange={(_, v) => setDescription(v.value)}
                  />
                </Field>
              </div>
            )}
          </DialogContent>
          <DialogActions className={styles.actions}>
            <DialogTrigger disableButtonEnhancement>
              <Button appearance="primary" disabled={!name || !!nameError || isCreating} onClick={handleCreate}>
                {isCreating ? INTL_TEXT.creatingButton : INTL_TEXT.createButton}
              </Button>
            </DialogTrigger>
            <DialogTrigger disableButtonEnhancement>
              <Button onClick={onDismiss} disabled={isCreating}>
                {INTL_TEXT.cancelButton}
              </Button>
            </DialogTrigger>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};
