import { useState } from 'react';
import {
  Popover,
  PopoverTrigger,
  PopoverSurface,
  Avatar,
  Button,
  Divider,
  Dropdown,
  Option,
  Field,
  Persona,
  makeStyles,
} from '@fluentui/react-components';
import { ClientOnly } from './ClientOnly';
import { useUserPhoto } from '../hooks/useUserPhoto';

const useStyles = makeStyles({
  trigger: {
    minWidth: 'auto',
    padding: '4px',
    borderRadius: '50%',
  },
  panel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    minWidth: '320px',
    padding: '16px',
  },
  persona: {
    // Persona component handles its own styling
  },
  directoryField: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  dropdown: {
    width: '100%',
  },
  divider: {
    // Divider handles its own styling
  },
  buttonGroup: {
    display: 'flex',
    flexDirection: 'row',
    gap: '8px',
  },
  button: {
    flex: 1,
  },
});

type Directory = {
  id: string;
  name: string;
};

const directories: Directory[] = [
  { id: 'microsoft', name: 'Microsoft' },
  { id: 'personal', name: 'Personal Account' },
];

export const UserProfileMenu = () => {
  return (
    <ClientOnly>
      <UserProfileMenuClient />
    </ClientOnly>
  );
};

const UserProfileMenuClient = () => {
  const styles = useStyles();
  const [open, setOpen] = useState(false);
  const [selectedDirectory, setSelectedDirectory] = useState('microsoft');
  const [msalHooks, setMsalHooks] = useState<{
    useMsal: () => any;
    useIsAuthenticated: () => boolean;
  } | null>(null);

  // Dynamic import to avoid SSR issues
  useState(() => {
    if (typeof window !== 'undefined') {
      import('@azure/msal-react').then((module) => {
        setMsalHooks({
          useMsal: module.useMsal,
          useIsAuthenticated: module.useIsAuthenticated,
        });
      });
    }
  });

  if (!msalHooks) {
    return null;
  }

  return (
    <UserProfileMenuContent
      msalHooks={msalHooks}
      styles={styles}
      open={open}
      setOpen={setOpen}
      selectedDirectory={selectedDirectory}
      setSelectedDirectory={setSelectedDirectory}
    />
  );
};

const UserProfileMenuContent = ({
  msalHooks,
  styles,
  open,
  setOpen,
  selectedDirectory,
  setSelectedDirectory,
}: {
  msalHooks: {
    useMsal: () => any;
    useIsAuthenticated: () => boolean;
  };
  styles: any;
  open: boolean;
  setOpen: (open: boolean) => void;
  selectedDirectory: string;
  setSelectedDirectory: (directory: string) => void;
}) => {
  const { accounts, instance } = msalHooks.useMsal();
  const isAuthenticated = msalHooks.useIsAuthenticated();
  const account = accounts[0];
  const { photoUrl } = useUserPhoto(instance, account, isAuthenticated);
  if (!isAuthenticated || !accounts[0]) {
    return null;
  }

  const handleSignOut = () => {
    instance.logoutRedirect({
      postLogoutRedirectUri: window.location.origin,
    });
  };

  const handleSwitchAccount = () => {
    setOpen(false);
    instance.loginRedirect({
      prompt: 'select_account',
    });
  };

  return (
    <Popover open={open} onOpenChange={(_, data) => setOpen(data.open)}>
      <PopoverTrigger disableButtonEnhancement>
        <Button
          appearance="subtle"
          className={styles.trigger}
          aria-label="User profile"
          icon={<Avatar name={account.name || 'User'} size={32} color="colorful" image={photoUrl ? { src: photoUrl } : undefined} />}
        />
      </PopoverTrigger>

      <PopoverSurface className={styles.panel}>
        {/* User Persona */}
        <Persona
          name={account.name || 'User'}
          secondaryText={account.username}
          avatar={<Avatar name={account.name || 'User'} size={48} color="colorful" image={photoUrl ? { src: photoUrl } : undefined} />}
        />

        {/* Directory Field */}
        <Field label="Directory" className={styles.directoryField}>
          <Dropdown
            className={styles.dropdown}
            value={directories.find((d) => d.id === selectedDirectory)?.name}
            selectedOptions={[selectedDirectory]}
            onOptionSelect={(_, data) => setSelectedDirectory(data.optionValue as string)}
          >
            {directories.map((directory) => (
              <Option key={directory.id} value={directory.id}>
                {directory.name}
              </Option>
            ))}
          </Dropdown>
        </Field>

        {/* Divider */}
        <Divider />

        {/* Action Buttons */}
        <div className={styles.buttonGroup}>
          <Button className={styles.button} onClick={handleSwitchAccount}>
            Sign in with a different account
          </Button>
          <Button className={styles.button} onClick={handleSignOut}>
            Sign out
          </Button>
        </div>
      </PopoverSurface>
    </Popover>
  );
};
