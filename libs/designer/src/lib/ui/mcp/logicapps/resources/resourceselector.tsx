import {
  Button,
  Combobox,
  Option,
  Text,
  Field,
  Input,
  Link,
  Popover,
  PopoverSurface,
  PopoverTrigger,
  Spinner,
  tokens,
} from '@fluentui/react-components';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useCreatePopupStyles, useCreateDetailsStyles } from '../styles';
import { useIntl } from 'react-intl';
import { equals, type Resource } from '@microsoft/logic-apps-shared';
import { Checkmark20Filled, Dismiss16Filled } from '@fluentui/react-icons';

export interface ResourceSelectorProps {
  selectedResource: string;
  setSelectedResource: (id: string) => void;
  newResourceName?: string;
  setNewResource: (id: string) => void;
}

const NO_ITEM_VALUE = 'NO_ITEM_VALUE';
const EMPTY_VALUE = 'EMPTY_VALUE';
export const ResourceSelectionWithCreate = ({
  resourcesList,
  required = true,
  isLoading,
  selectedResourceId,
  onSelect,
  onCreate,
  getResourceId,
  newResourceName,
  createPlaceholder,
  createDescription,
  validateResourceName,
}: {
  resourcesList: Resource[];
  required?: boolean;
  isLoading: boolean;
  selectedResourceId: string;
  onSelect: (id: string) => void;
  onCreate: (id: string) => void;
  getResourceId: (name: string) => string | undefined;
  createPlaceholder: string;
  createDescription: string;
  validateResourceName: (name: string) => Promise<string | undefined>;
  newResourceName?: string;
}) => {
  const intl = useIntl();
  const styles = useCreateDetailsStyles();

  const intlTexts = {
    loading: intl.formatMessage({
      defaultMessage: 'Loading resources ...',
      id: 'bNKDe5',
      description: 'Loading resources',
    }),
    searchPlaceholder: intl.formatMessage({
      defaultMessage: 'Search resources...',
      id: 'LzgX0P',
      description: 'Placeholder text for resource search',
    }),
    selectPlaceholder: intl.formatMessage({
      defaultMessage: 'Select a resource',
      id: 'mILANb',
      description: 'Placeholder text for resource selection',
    }),
    noResources: intl.formatMessage({
      defaultMessage: 'No resources found',
      id: 'RqYHs0',
      description: 'Text for no resources found',
    }),
    noResults: intl.formatMessage({
      defaultMessage: 'No results for',
      id: 'W83QYZ',
      description: 'Text displayed when no results match the search term',
    }),
  };
  const [searchTerm, setSearchTerm] = useState<string | undefined>(undefined);

  const resources = useMemo(() => {
    const result = newResourceName
      ? [{ id: getResourceId(newResourceName)?.toLowerCase(), name: newResourceName, displayName: `${newResourceName} (new)` }]
      : [];
    const sortedResources = (resourcesList ?? []).sort((a, b) => a.displayName.localeCompare(b.displayName));

    if (!required) {
      result.unshift({ id: EMPTY_VALUE, name: '', displayName: '' });
    }
    return [...result, ...sortedResources];
  }, [newResourceName, getResourceId, resourcesList, required]);

  const controlValue = useMemo(() => {
    if (searchTerm !== undefined) {
      return searchTerm;
    }

    const selectedResourceInfo = resources.find((r) => equals(r.id, selectedResourceId));
    return selectedResourceInfo?.displayName ?? selectedResourceId;
  }, [searchTerm, resources, selectedResourceId]);

  const filteredResources = useMemo(() => {
    if (!searchTerm?.trim()) {
      return resources;
    }

    return resources.filter((resource) => resource.displayName.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [resources, searchTerm]);

  const handleOKClick = useCallback(
    (name: string) => {
      const resourceId = getResourceId(name)?.toLowerCase();
      onCreate(resourceId ?? '');
      setSearchTerm(undefined);
    },
    [getResourceId, onCreate]
  );

  return (
    <Field required={true}>
      <div className={styles.comboboxContainer}>
        <Combobox
          className={styles.combobox}
          disabled={isLoading}
          value={controlValue}
          selectedOptions={selectedResourceId ? [selectedResourceId] : []}
          placeholder={isLoading ? intlTexts.loading : intlTexts.searchPlaceholder}
          onOptionSelect={(_, data) => {
            if (data.optionValue && data.optionValue !== NO_ITEM_VALUE && !equals(data.optionValue, selectedResourceId)) {
              const resourceId = data.optionValue === EMPTY_VALUE ? '' : (resources.find((r) => equals(r.id, data.optionValue))?.id ?? '');
              onSelect(resourceId);
              setSearchTerm(undefined);
            }
          }}
          onChange={(e) => {
            setSearchTerm(e.target.value);
          }}
        >
          {!isLoading && !filteredResources.length ? (
            <Option key={'no-items'} value={NO_ITEM_VALUE} disabled>
              {searchTerm?.trim() ? `${intlTexts.noResults} "${searchTerm}"` : intlTexts.noResources}
            </Option>
          ) : (
            filteredResources.map((resource) => (
              <Option key={resource.id} value={resource.id}>
                {resource.displayName}
              </Option>
            ))
          )}
        </Combobox>
      </div>
      <CreateResource
        disabled={!!newResourceName}
        placeholder={createPlaceholder}
        description={createDescription}
        validateResourceName={validateResourceName}
        onCreate={handleOKClick}
      />
    </Field>
  );
};

const CreateResource = ({
  disabled,
  placeholder,
  description,
  validateResourceName,
  onCreate,
}: {
  disabled?: boolean;
  placeholder: string;
  description: string;
  validateResourceName: (name: string) => Promise<string | undefined>;
  onCreate: (name: string) => void;
}) => {
  const styles = useCreatePopupStyles();
  const intl = useIntl();
  const intlTexts = {
    createButtonLabel: intl.formatMessage({
      defaultMessage: 'Create new',
      id: 'OUS/aL',
      description: 'Label for the create button',
    }),
    nameLabel: intl.formatMessage({
      defaultMessage: 'Name',
      id: 'OMbXig',
      description: 'Label for the name input',
    }),
    OkLabel: intl.formatMessage({
      defaultMessage: 'OK',
      id: '+QUFXQ',
      description: 'Label for the ok button',
    }),
    cancelLabel: intl.formatMessage({
      defaultMessage: 'Cancel',
      id: '+64+eE',
      description: 'Label for the cancel button',
    }),
  };
  const [reset, setReset] = useState<boolean | undefined>(undefined);
  const [resourceName, setResourceName] = useState<string | undefined>(undefined);
  const [isValid, setIsValid] = useState<boolean | undefined>(undefined);
  const [isValidating, setIsValidating] = useState<boolean | undefined>(undefined);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showCreateDialog, setShowCreateDialog] = useState<boolean>(false);

  useEffect(() => {
    if (reset !== undefined) {
      setResourceName(undefined);
      setIsValid(undefined);
      setErrorMessage('');
      setIsValidating(undefined);
    }
  }, [reset]);

  const validateValue = useCallback(
    async (name: string) => {
      if (name?.trim()) {
        setIsValidating(true);
        const invalidError = await validateResourceName(name);
        setIsValidating(false);
        setErrorMessage(invalidError ?? '');
        setIsValid(!invalidError);
      } else {
        setIsValid(false);
        setErrorMessage(
          intl.formatMessage({
            defaultMessage: 'Name is required',
            id: 'hwgU6Y',
            description: 'Error message when name is empty',
          })
        );
      }
    },
    [intl, validateResourceName]
  );

  useEffect(() => {
    if (resourceName !== undefined) {
      validateValue(resourceName);
    }
  }, [intl, resourceName, validateResourceName, validateValue]);

  const validateIcon = useMemo(() => {
    if (isValidating === undefined) {
      return null;
    }
    return isValidating ? (
      <Spinner size="tiny" />
    ) : isValid ? (
      <Checkmark20Filled color={tokens.colorStatusSuccessForeground3} />
    ) : (
      <Dismiss16Filled color={tokens.colorStatusDangerForeground1} />
    );
  }, [isValidating, isValid]);

  const handleOnChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setResourceName(newValue);
  }, []);

  const handleOKClick = useCallback(async () => {
    onCreate(resourceName ?? '');
    setShowCreateDialog(false);
    setReset(!reset);
  }, [onCreate, reset, resourceName]);

  const handleToggleCreate = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      setShowCreateDialog(!showCreateDialog);
      setReset(!reset);
      e.stopPropagation();
    },
    [reset, showCreateDialog]
  );

  const handleCancelClick = useCallback(() => {
    setShowCreateDialog(false);
    setReset(!reset);
  }, [reset]);

  return (
    <Popover
      open={showCreateDialog}
      withArrow
      positioning="below"
      onOpenChange={(_e, data) => {
        if (!data.open) {
          setShowCreateDialog(false);
          setReset(!reset);
        }
      }}
    >
      <PopoverTrigger disableButtonEnhancement>
        <Link className={styles.linkSection} onClick={handleToggleCreate} disabled={disabled}>
          {intlTexts.createButtonLabel}
        </Link>
      </PopoverTrigger>

      <PopoverSurface tabIndex={-1} onClick={(e) => e.stopPropagation()}>
        <Text weight="bold">{description}</Text>
        <Field
          className={styles.inputSection}
          required={true}
          validationState={isValid === false ? 'error' : undefined}
          validationMessage={errorMessage}
          label={intlTexts.nameLabel}
        >
          <Input contentAfter={validateIcon} autoFocus={true} value={resourceName} placeholder={placeholder} onChange={handleOnChange} />
        </Field>
        <div className={styles.buttonSection}>
          <Button appearance="primary" disabled={!isValid} onClick={handleOKClick}>
            {intlTexts.OkLabel}
          </Button>
          <Button onClick={handleCancelClick}>{intlTexts.cancelLabel}</Button>
        </div>
      </PopoverSurface>
    </Popover>
  );
};
