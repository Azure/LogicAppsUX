import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { MessageFormatElement } from 'react-intl';
import fr from '../../Localize/compiled-lang/strings.fr.json';
import en from '../../Localize/compiled-lang/strings.json';

export interface LocalizationState {
  locale: string;
  defaultLocale: string;
  messages: Record<string, string> | Record<string, MessageFormatElement[]>;
}

const loadLocaleData = async (locale: string) => {
  switch (locale.split('-')[0].toLowerCase()) {
    case 'fr':
      return fr;
    // case 'en':
    //   if (locale === 'en-XA')
    //     return import('../../Localize/compiled-lang/strings.en-XA.json');
    //   else return import('../../Localize/compiled-lang/strings.json');
    // case 'cs':
    //   return import('../../Localize/compiled-lang/strings.cs.json');
    // case 'de':
    //   return import('../../Localize/compiled-lang/strings.de.json');
    // case 'es':
    //   return import('../../Localize/compiled-lang/strings.es.json');
    // case 'hu':
    //   return import('../../Localize/compiled-lang/strings.hu.json');
    // case 'it':
    //   return import('../../Localize/compiled-lang/strings.it.json');
    // case 'ja':
    //   return import('../../Localize/compiled-lang/strings.ja.json');
    // case 'ko':
    //   return import('../../Localize/compiled-lang/strings.ko.json');
    // case 'nl':
    //   return import('../../Localize/compiled-lang/strings.nl.json');
    // case 'pl':
    //   return import('../../Localize/compiled-lang/strings.pl.json');
    // case 'pt':
    //   if (locale === 'pt-BR')
    //     return import('../../Localize/compiled-lang/strings.pt-BR.json');
    //   else return import('../../Localize/compiled-lang/strings.pt-PT.json');
    // case 'ru':
    //   return import('../../Localize/compiled-lang/strings.ru.json');
    // case 'sv':
    //   return import('../../Localize/compiled-lang/strings.sv.json');
    // case 'tr':
    //   return import('../../Localize/compiled-lang/strings.tr.json');
    // case 'zh':
    //   if (locale === 'zh-Hans')
    //     return import('../../Localize/compiled-lang/strings.zh-Hans.json');
    //   else return import('../../Localize/compiled-lang/strings.zh-Hant.json');
    default:
      return en;
  }
};

export const loadLocaleMessages = createAsyncThunk(
  'localizations/loadLocaleMessages',
  async (locale: string) => {
    const messages = await loadLocaleData(locale);
    return {
      messages: messages,
      locale,
    };
  }
);

const initialState: LocalizationState = {
  locale: 'en',
  defaultLocale: 'en',
  messages: {},
};

export const localizationSlice = createSlice({
  name: 'localization',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    // Add reducers for additional action types here, and handle loading state as needed
    builder.addCase(loadLocaleMessages.fulfilled, (state, action) => {
      const { messages, locale } = action.payload;
      state.messages = messages;
      state.locale = locale;
    });
  },
});

//export const {} = localizationSlice.actions;

export default localizationSlice.reducer;
