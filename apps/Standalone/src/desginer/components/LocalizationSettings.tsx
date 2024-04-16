import type { AppDispatch, RootState } from '../state/store';
import { setLanguage } from '../state/workflowLoadingSlice';
import { Dropdown } from '@fluentui/react';
import { useDispatch, useSelector } from 'react-redux';

export const LocalizationSettings = () => {
  const { language } = useSelector((state: RootState) => {
    return state.workflowLoader;
  });
  const dispatch = useDispatch<AppDispatch>();

  return (
    <Dropdown
      label="Language"
      options={[
        {
          key: 'en',
          text: 'English',
        },
        {
          key: 'zh',
          text: 'Chinese',
        },
        {
          key: 'ja',
          text: 'Japanese',
        },
        {
          key: 'ko',
          text: 'Korean',
        },
        {
          key: 'de',
          text: 'German',
        },
        {
          key: 'fr',
          text: 'French',
        },
        {
          key: 'id',
          text: 'Indonesian',
        },
        {
          key: 'en-XA',
          text: 'Test Language (en-XA)',
        },
      ]}
      selectedKey={language}
      defaultValue={'en'}
      onChange={(_, option) => {
        dispatch(setLanguage(option?.key as string));
      }}
    />
  );
};
