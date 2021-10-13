import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { MessageFormatElement } from 'react-intl';
import fr from '../../../../../../Localize/compiled-lang/strings.fr.json';
import en from '../../../../../../Localize/compiled-lang/strings.json';
import enxa from '../../../../../../Localize/compiled-lang/strings.en-XA.json';
import cs from '../../../../../../Localize/compiled-lang/strings.cs.json';
import de from '../../../../../../Localize/compiled-lang/strings.de.json';
import es from '../../../../../../Localize/compiled-lang/strings.es.json';
import hu from '../../../../../../Localize/compiled-lang/strings.hu.json';
import it from '../../../../../../Localize/compiled-lang/strings.it.json';
import ja from '../../../../../../Localize/compiled-lang/strings.ja.json';
import ko from '../../../../../../Localize/compiled-lang/strings.ko.json';
import nl from '../../../../../../Localize/compiled-lang/strings.nl.json';
import pl from '../../../../../../Localize/compiled-lang/strings.pl.json';
import ptbr from '../../../../../../Localize/compiled-lang/strings.pt-BR.json';
import ptpt from '../../../../../../Localize/compiled-lang/strings.pt-PT.json';
import ru from '../../../../../../Localize/compiled-lang/strings.ru.json';
import sv from '../../../../../../Localize/compiled-lang/strings.sv.json';
import tr from '../../../../../../Localize/compiled-lang/strings.tr.json';
import zhhans from '../../../../../../Localize/compiled-lang/strings.zh-Hans.json';
import zhhant from '../../../../../../Localize/compiled-lang/strings.zh-Hant.json';
export interface LocalizationState {
  locale: string;
  defaultLocale: string;
  messages: Record<string, string> | Record<string, MessageFormatElement[]>;
}

const loadLocaleData = async (locale: string) => {
  switch (locale.split('-')[0].toLowerCase()) {
    case 'nl':
      return nl;
    case 'pl':
      return pl;
    case 'pt':
      if (locale === 'pt-BR') return ptbr;
      else return ptpt;
    case 'ru':
      return ru;
    case 'sv':
      return sv;
    case 'tr':
      return tr;
    case 'zh':
      if (locale === 'zh-Hans') return zhhans;
      else return zhhant;
    case 'fr':
      return fr;
    case 'en':
      if (locale === 'en-XA') return enxa;
      else return en;
    case 'cs':
      return cs;
    case 'de':
      return de;
    case 'es':
      return es;
    case 'hu':
      return hu;
    case 'it':
      return it;
    case 'ja':
      return ja;
    case 'ko':
      return ko;

    default:
      return en;
  }
};

export const loadLocaleMessages = createAsyncThunk('localizations/loadLocaleMessages', async (locale: string) => {
  const messages = await loadLocaleData(locale);
  return {
    messages: messages,
    locale,
  };
});

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
