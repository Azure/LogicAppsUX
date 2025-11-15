import { useState } from 'react';
import {
  Popover,
  PopoverTrigger,
  PopoverSurface,
  Button,
  Label,
  Link,
  Dropdown,
  Option,
  makeStyles,
  tokens,
  mergeClasses,
} from '@fluentui/react-components';
import { Settings24Regular } from '@fluentui/react-icons';
import { useTheme, type ThemeMode } from '../contexts/ThemeContext';

const useStyles = makeStyles({
  trigger: {
    minWidth: 'auto',
    padding: '8px',
  },
  panel: {
    minWidth: '280px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  label: {
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
  themesGroup: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'space-between',
  },
  themeOption: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    background: 'transparent',
    border: 'none',
    padding: '0',
    cursor: 'pointer',
    ':focus': {
      outline: 'none',
    },
  },
  themeImageWrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.borderRadiusXLarge,
    transition: 'border-color 0.2s',
    border: '3px solid transparent',
  },
  themeImageWrapperSelected: {
    border: `3px solid ${tokens.colorBrandStroke1}`,
  },
  themeImage: {
    width: '79px',
    height: '44px',
    display: 'block',
  },
  themeLabel: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground1,
  },
  languageSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  dropdown: {
    width: '100%',
  },
  footer: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingTop: '8px',
  },
  footerLink: {
    fontSize: tokens.fontSizeBase200,
  },
});

type ThemeOption = {
  mode: ThemeMode;
  label: string;
  image: string;
};

const themeOptions: ThemeOption[] = [
  { mode: 'system', label: 'System', image: '/SystemTheme.svg' },
  { mode: 'light', label: 'Light', image: '/LightTheme.svg' },
  { mode: 'dark', label: 'Dark', image: '/DarkTheme.svg' },
];

const languages = [
  { id: 'en', name: 'English' },
  { id: 'es', name: 'Español' },
  { id: 'fr', name: 'Français' },
  { id: 'de', name: 'Deutsch' },
  { id: 'ja', name: '日本語' },
  { id: 'zh', name: '中文' },
];

export const ThemeSwitcher = () => {
  const styles = useStyles();
  const { themeMode, setThemeMode } = useTheme();
  const [open, setOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('en');

  const handleThemeChange = (mode: ThemeMode) => {
    setThemeMode(mode);
  };

  return (
    <Popover open={open} onOpenChange={(_, data) => setOpen(data.open)}>
      <PopoverTrigger disableButtonEnhancement>
        <Button appearance="subtle" icon={<Settings24Regular />} className={styles.trigger} aria-label="Theme settings" />
      </PopoverTrigger>

      <PopoverSurface className={styles.panel}>
        {/* Themes Section */}
        <div className={styles.section}>
          <Label className={styles.label}>Themes</Label>
          <div className={styles.themesGroup} role="radiogroup" aria-label="Themes">
            {themeOptions.map((option) => {
              const isSelected = themeMode === option.mode;

              return (
                <button
                  key={option.mode}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  className={styles.themeOption}
                  onClick={() => handleThemeChange(option.mode)}
                >
                  <div className={mergeClasses(styles.themeImageWrapper, isSelected && styles.themeImageWrapperSelected)}>
                    <img src={option.image} alt="" className={styles.themeImage} />
                  </div>
                  <span className={styles.themeLabel}>{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Language Section */}
        <div className={styles.languageSection}>
          <Label className={styles.label}>Language</Label>
          <Dropdown
            className={styles.dropdown}
            value={languages.find((l) => l.id === selectedLanguage)?.name}
            selectedOptions={[selectedLanguage]}
            onOptionSelect={(_, data) => setSelectedLanguage(data.optionValue as string)}
            aria-label="Language"
          >
            {languages.map((lang) => (
              <Option key={lang.id} value={lang.id}>
                {lang.name}
              </Option>
            ))}
          </Dropdown>
        </div>

        {/* Footer Links */}
        <div className={styles.footer}>
          <Link
            className={styles.footerLink}
            href="https://go.microsoft.com/fwlink/?linkid=521839"
            target="_blank"
            rel="noopener noreferrer"
          >
            Privacy & cookies
          </Link>
          <Link className={styles.footerLink} href="https://aka.ms/aistudio/terms" target="_blank" rel="noopener noreferrer">
            Terms & conditions
          </Link>
          <Link
            className={styles.footerLink}
            href="https://go.microsoft.com/fwlink/?linkid=2196228"
            target="_blank"
            rel="noopener noreferrer"
          >
            Trademarks
          </Link>
        </div>
      </PopoverSurface>
    </Popover>
  );
};
