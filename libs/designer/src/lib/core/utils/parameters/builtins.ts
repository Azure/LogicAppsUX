import { loadParameterValuesFromDefault, toParameterInfoMap } from './helper';
import { frequencyValues } from '@microsoft-logic-apps/designer-client-services';
import { getIntl } from '@microsoft-logic-apps/intl';
import { OutputMapKey, parseEx, SchemaProcessor, toInputParameter } from '@microsoft-logic-apps/parsers';
import type { RecurrenceSetting } from '@microsoft-logic-apps/utils';
import { getObjectPropertyValue, map, RecurrenceType } from '@microsoft-logic-apps/utils';
import type { ParameterInfo } from '@microsoft/designer-ui';

const intl = getIntl();

const timeZoneValues = [
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC-12:00) International Date Line West', description: 'Timezone value ' }),
    value: 'Dateline Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC-11:00) Coordinated Universal Time-11', description: 'Timezone value ' }),
    value: 'UTC-11',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC-10:00) Aleutian Islands', description: 'Timezone value ' }),
    value: 'Aleutian Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC-10:00) Hawaii', description: 'Timezone value ' }),
    value: 'Hawaiian Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC-09:30) Marquesas Islands', description: 'Timezone value ' }),
    value: 'Marquesas Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC-09:00) Alaska', description: 'Timezone value ' }),
    value: 'Alaskan Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC-09:00) Coordinated Universal Time-09', description: 'Timezone value ' }),
    value: 'UTC-09',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC-08:00) Baja California', description: 'Timezone value ' }),
    value: 'Pacific Standard Time (Mexico)',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC-08:00) Coordinated Universal Time-08', description: 'Timezone value ' }),
    value: 'UTC-08',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC-08:00) Pacific Time (US & Canada)', description: 'Timezone value ' }),
    value: 'Pacific Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC-07:00) Arizona', description: 'Timezone value ' }),
    value: 'US Mountain Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC-07:00) Chihuahua, La Paz, Mazatlan', description: 'Timezone value ' }),
    value: 'Mountain Standard Time (Mexico)',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC-07:00) Mountain Time (US & Canada)', description: 'Timezone value ' }),
    value: 'Mountain Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC-06:00) Central America', description: 'Timezone value ' }),
    value: 'Central America Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC-06:00) Central Time (US & Canada)', description: 'Timezone value ' }),
    value: 'Central Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC-06:00) Easter Island', description: 'Timezone value ' }),
    value: 'Easter Island Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC-06:00) Guadalajara, Mexico City, Monterrey', description: 'Timezone value ' }),
    value: 'Central Standard Time (Mexico)',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC-06:00) Saskatchewan', description: 'Timezone value ' }),
    value: 'Canada Central Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC-05:00) Bogota, Lima, Quito, Rio Branco', description: 'Timezone value ' }),
    value: 'SA Pacific Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC-05:00) Chetumal', description: 'Timezone value ' }),
    value: 'Eastern Standard Time (Mexico)',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC-05:00) Eastern Time (US & Canada)', description: 'Timezone value ' }),
    value: 'Eastern Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC-05:00) Haiti', description: 'Timezone value ' }),
    value: 'Haiti Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC-05:00) Havana', description: 'Timezone value ' }),
    value: 'Cuba Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC-05:00) Indiana (East)', description: 'Timezone value ' }),
    value: 'US Eastern Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC-04:00) Asuncion', description: 'Timezone value ' }),
    value: 'Paraguay Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC-04:00) Atlantic Time (Canada)', description: 'Timezone value ' }),
    value: 'Atlantic Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC-04:00) Caracas', description: 'Timezone value ' }),
    value: 'Venezuela Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC-04:00) Cuiaba', description: 'Timezone value ' }),
    value: 'Central Brazilian Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC-04:00) Georgetown, La Paz, Manaus, San Juan', description: 'Timezone value ' }),
    value: 'SA Western Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC-04:00) Santiago', description: 'Timezone value ' }),
    value: 'Pacific SA Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC-04:00) Turks and Caicos', description: 'Timezone value ' }),
    value: 'Turks And Caicos Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC-03:30) Newfoundland', description: 'Timezone value ' }),
    value: 'Newfoundland Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC-03:00) Araguaina', description: 'Timezone value ' }),
    value: 'Tocantins Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC-03:00) Brasilia', description: 'Timezone value ' }),
    value: 'E. South America Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC-03:00) Cayenne, Fortaleza', description: 'Timezone value ' }),
    value: 'SA Eastern Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC-03:00) City of Buenos Aires', description: 'Timezone value ' }),
    value: 'Argentina Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC-03:00) Greenland', description: 'Timezone value ' }),
    value: 'Greenland Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC-03:00) Montevideo', description: 'Timezone value ' }),
    value: 'Montevideo Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC-03:00) Saint Pierre and Miquelon', description: 'Timezone value ' }),
    value: 'Saint Pierre Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC-03:00) Salvador', description: 'Timezone value ' }),
    value: 'Bahia Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC-02:00) Coordinated Universal Time-02', description: 'Timezone value ' }),
    value: 'UTC-02',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC-02:00) Mid-Atlantic - Old', description: 'Timezone value ' }),
    value: 'Mid-Atlantic Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC-01:00) Azores', description: 'Timezone value ' }),
    value: 'Azores Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC-01:00) Cabo Verde Is.', description: 'Timezone value ' }),
    value: 'Cape Verde Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC) Coordinated Universal Time', description: 'Timezone value ' }),
    value: 'UTC',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC+00:00) Casablanca', description: 'Timezone value ' }),
    value: 'Morocco Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC+00:00) Dublin, Edinburgh, Lisbon, London', description: 'Timezone value ' }),
    value: 'GMT Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC+00:00) Monrovia, Reykjavik', description: 'Timezone value ' }),
    value: 'Greenwich Standard Time',
  },
  {
    displayName: intl.formatMessage({
      defaultMessage: '(UTC+01:00) Amsterdam, Berlin, Bern, Rome, Stockholm, Vienna',
      description: 'Timezone value ',
    }),
    value: 'W. Europe Standard Time',
  },
  {
    displayName: intl.formatMessage({
      defaultMessage: '(UTC+01:00) Belgrade, Bratislava, Budapest, Ljubljana, Prague',
      description: 'Timezone value ',
    }),
    value: 'Central Europe Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC+01:00) Brussels, Copenhagen, Madrid, Paris', description: 'Timezone value ' }),
    value: 'Romance Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC+01:00) Sarajevo, Skopje, Warsaw, Zagreb', description: 'Timezone value ' }),
    value: 'Central European Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC+01:00) West Central Africa', description: 'Timezone value ' }),
    value: 'W. Central Africa Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC+01:00) Windhoek', description: 'Timezone value ' }),
    value: 'Namibia Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC+02:00) Amman', description: 'Timezone value ' }),
    value: 'Jordan Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC+02:00) Athens, Bucharest', description: 'Timezone value ' }),
    value: 'GTB Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC+02:00) Beirut', description: 'Timezone value ' }),
    value: 'Middle East Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC+02:00) Cairo', description: 'Timezone value ' }),
    value: 'Egypt Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC+02:00) Chisinau', description: 'Timezone value ' }),
    value: 'E. Europe Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC+02:00) Damascus', description: 'Timezone value ' }),
    value: 'Syria Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC+02:00) Gaza, Hebron', description: 'Timezone value ' }),
    value: 'West Bank Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC+02:00) Harare, Pretoria', description: 'Timezone value ' }),
    value: 'South Africa Standard Time',
  },
  {
    displayName: intl.formatMessage({
      defaultMessage: '(UTC+02:00) Helsinki, Kyiv, Riga, Sofia, Tallinn, Vilnius',
      description: 'Timezone value ',
    }),
    value: 'FLE Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC+02:00) Istanbul', description: 'Timezone value ' }),
    value: 'Turkey Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC+02:00) Jerusalem', description: 'Timezone value ' }),
    value: 'Israel Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC+02:00) Kaliningrad', description: 'Timezone value ' }),
    value: 'Kaliningrad Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC+02:00) Tripoli', description: 'Timezone value ' }),
    value: 'Libya Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC+03:00) Baghdad', description: 'Timezone value ' }),
    value: 'Arabic Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC+03:00) Kuwait, Riyadh', description: 'Timezone value ' }),
    value: 'Arab Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC+03:00) Minsk', description: 'Timezone value ' }),
    value: 'Belarus Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC+03:00) Moscow, St. Petersburg, Volgograd', description: 'Timezone value ' }),
    value: 'Russian Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC+03:00) Nairobi', description: 'Timezone value ' }),
    value: 'E. Africa Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC+03:30) Tehran', description: 'Timezone value ' }),
    value: 'Iran Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC+04:00) Abu Dhabi, Muscat', description: 'Timezone value ' }),
    value: 'Arabian Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC+04:00) Astrakhan, Ulyanovsk', description: 'Timezone value ' }),
    value: 'Astrakhan Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC+04:00) Baku', description: 'Timezone value ' }),
    value: 'Azerbaijan Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC+04:00) Izhevsk, Samara', description: 'Timezone value ' }),
    value: 'Russia Time Zone 3',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC+04:00) Port Louis', description: 'Timezone value ' }),
    value: 'Mauritius Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC+04:00) Tbilisi', description: 'Timezone value ' }),
    value: 'Georgian Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC+04:00) Yerevan', description: 'Timezone value ' }),
    value: 'Caucasus Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC+04:30) Kabul', description: 'Timezone value ' }),
    value: 'Afghanistan Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC+05:00) Ashgabat, Tashkent', description: 'Timezone value ' }),
    value: 'West Asia Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC+05:00) Ekaterinburg', description: 'Timezone value ' }),
    value: 'Ekaterinburg Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC+05:00) Islamabad, Karachi', description: 'Timezone value ' }),
    value: 'Pakistan Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC+05:30) Chennai, Kolkata, Mumbai, New Delhi', description: 'Timezone value ' }),
    value: 'India Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC+05:30) Sri Jayawardenepura', description: 'Timezone value ' }),
    value: 'Sri Lanka Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC+05:45) Kathmandu', description: 'Timezone value ' }),
    value: 'Nepal Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC+06:00) Astana', description: 'Timezone value ' }),
    value: 'Central Asia Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC+06:00) Dhaka', description: 'Timezone value ' }),
    value: 'Bangladesh Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC+06:00) Novosibirsk', description: 'Timezone value ' }),
    value: 'N. Central Asia Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC+06:30) Yangon (Rangoon)', description: 'Timezone value ' }),
    value: 'Myanmar Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC+07:00) Bangkok, Hanoi, Jakarta', description: 'Timezone value ' }),
    value: 'SE Asia Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC+07:00) Barnaul, Gorno-Altaysk', description: 'Timezone value ' }),
    value: 'Altai Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC+07:00) Hovd', description: 'Timezone value ' }),
    value: 'W. Mongolia Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC+07:00) Krasnoyarsk', description: 'Timezone value ' }),
    value: 'North Asia Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC+07:00) Tomsk', description: 'Timezone value ' }),
    value: 'Tomsk Standard Time',
  },
  {
    displayName: intl.formatMessage({
      defaultMessage: '(UTC+08:00) Beijing, Chongqing, Hong Kong, Urumqi',
      description: 'Timezone value ',
    }),
    value: 'China Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC+08:00) Irkutsk', description: 'Timezone value ' }),
    value: 'North Asia East Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC+08:00) Kuala Lumpur, Singapore', description: 'Timezone value ' }),
    value: 'Singapore Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC+08:00) Perth', description: 'Timezone value ' }),
    value: 'W. Australia Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC+08:00) Taipei', description: 'Timezone value ' }),
    value: 'Taipei Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC+08:00) Ulaanbaatar', description: 'Timezone value ' }),
    value: 'Ulaanbaatar Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC+08:30) Pyongyang', description: 'Timezone value ' }),
    value: 'North Korea Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC+08:45) Eucla', description: 'Timezone value ' }),
    value: 'Aus Central W. Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC+09:00) Chita', description: 'Timezone value ' }),
    value: 'Transbaikal Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC+09:00) Osaka, Sapporo, Tokyo', description: 'Timezone value ' }),
    value: 'Tokyo Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC+09:00) Seoul', description: 'Timezone value ' }),
    value: 'Korea Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC+09:00) Yakutsk', description: 'Timezone value ' }),
    value: 'Yakutsk Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC+09:30) Adelaide', description: 'Timezone value ' }),
    value: 'Cen. Australia Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC+09:30) Darwin', description: 'Timezone value ' }),
    value: 'AUS Central Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC+10:00) Brisbane', description: 'Timezone value ' }),
    value: 'E. Australia Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC+10:00) Canberra, Melbourne, Sydney', description: 'Timezone value ' }),
    value: 'AUS Eastern Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC+10:00) Guam, Port Moresby', description: 'Timezone value ' }),
    value: 'West Pacific Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC+10:00) Hobart', description: 'Timezone value ' }),
    value: 'Tasmania Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC+10:00) Vladivostok', description: 'Timezone value ' }),
    value: 'Vladivostok Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC+10:30) Lord Howe Island', description: 'Timezone value ' }),
    value: 'Lord Howe Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC+11:00) Bougainville Island', description: 'Timezone value ' }),
    value: 'Bougainville Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC+11:00) Chokurdakh', description: 'Timezone value ' }),
    value: 'Russia Time Zone 10',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC+11:00) Magadan', description: 'Timezone value ' }),
    value: 'Magadan Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC+11:00) Norfolk Island', description: 'Timezone value ' }),
    value: 'Norfolk Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC+11:00) Sakhalin', description: 'Timezone value ' }),
    value: 'Sakhalin Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC+11:00) Solomon Is., New Caledonia', description: 'Timezone value ' }),
    value: 'Central Pacific Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC+12:00) Anadyr, Petropavlovsk-Kamchatsky', description: 'Timezone value ' }),
    value: 'Russia Time Zone 11',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC+12:00) Auckland, Wellington', description: 'Timezone value ' }),
    value: 'New Zealand Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC+12:00) Coordinated Universal Time+12', description: 'Timezone value ' }),
    value: 'UTC+12',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC+12:00) Fiji', description: 'Timezone value ' }),
    value: 'Fiji Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC+12:00) Petropavlovsk-Kamchatsky - Old', description: 'Timezone value ' }),
    value: 'Kamchatka Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC+12:45) Chatham Islands', description: 'Timezone value ' }),
    value: 'Chatham Islands Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: "(UTC+13:00) Nuku'alofa", description: 'Timezone value ' }),
    value: 'Tonga Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC+13:00) Samoa', description: 'Timezone value ' }),
    value: 'Samoa Standard Time',
  },
  {
    displayName: intl.formatMessage({ defaultMessage: '(UTC+14:00) Kiritimati Island', description: 'Timezone value ' }),
    value: 'Line Islands Standard Time',
  },
];
const basicRecurrenceSchema = {
  type: 'object',
  properties: {
    frequency: {
      type: 'string',
      'x-ms-editor': 'combobox',
      'x-ms-editor-options': {
        options: frequencyValues,
      },
      default: 'Minute',
      title: 'Frequency',
    },
    interval: {
      type: 'number',
      title: 'Interval',
      default: 3,
    },
    startTime: {
      type: 'string',
      format: 'datetime',
      description: 'Example: 2017-03-24T15:00:00Z',
    },
    timeZone: {
      type: 'string',
      title: 'Timezone',
      'x-ms-editor': 'combobox',
      'x-ms-editor-options': {
        options: timeZoneValues,
      },
    },
  },
  required: ['frequency', 'interval'],
};

const advancedRecurrenceSchema = {
  type: 'object',
  properties: {
    ...basicRecurrenceSchema.properties,
    schedule: {
      type: 'object',
      properties: {
        hours: {
          type: 'array',
          title: 'At these hours',
          description: 'Example: 0, 10',
          'x-ms-editor': 'dropdown',
          'x-ms-editor-options': {
            multiSelect: true,
            titleSeparator: ',',
            options: [
              { value: '0', displayName: intl.formatMessage({ defaultMessage: '0', description: 'Hour of the day' }) },
              { value: '1', displayName: intl.formatMessage({ defaultMessage: '1', description: 'Hour of the day' }) },
              { value: '2', displayName: intl.formatMessage({ defaultMessage: '2', description: 'Hour of the day' }) },
              { value: '3', displayName: intl.formatMessage({ defaultMessage: '3', description: 'Hour of the day' }) },
              { value: '4', displayName: intl.formatMessage({ defaultMessage: '4', description: 'Hour of the day' }) },
              { value: '5', displayName: intl.formatMessage({ defaultMessage: '5', description: 'Hour of the day' }) },
              { value: '6', displayName: intl.formatMessage({ defaultMessage: '6', description: 'Hour of the day' }) },
              { value: '7', displayName: intl.formatMessage({ defaultMessage: '7', description: 'Hour of the day' }) },
              { value: '8', displayName: intl.formatMessage({ defaultMessage: '8', description: 'Hour of the day' }) },
              { value: '9', displayName: intl.formatMessage({ defaultMessage: '9', description: 'Hour of the day' }) },
              { value: '10', displayName: intl.formatMessage({ defaultMessage: '10', description: 'Hour of the day' }) },
              { value: '11', displayName: intl.formatMessage({ defaultMessage: '11', description: 'Hour of the day' }) },
              { value: '12', displayName: intl.formatMessage({ defaultMessage: '12', description: 'Hour of the day' }) },
              { value: '13', displayName: intl.formatMessage({ defaultMessage: '13', description: 'Hour of the day' }) },
              { value: '14', displayName: intl.formatMessage({ defaultMessage: '14', description: 'Hour of the day' }) },
              { value: '15', displayName: intl.formatMessage({ defaultMessage: '15', description: 'Hour of the day' }) },
              { value: '16', displayName: intl.formatMessage({ defaultMessage: '16', description: 'Hour of the day' }) },
              { value: '17', displayName: intl.formatMessage({ defaultMessage: '17', description: 'Hour of the day' }) },
              { value: '18', displayName: intl.formatMessage({ defaultMessage: '18', description: 'Hour of the day' }) },
              { value: '19', displayName: intl.formatMessage({ defaultMessage: '19', description: 'Hour of the day' }) },
              { value: '20', displayName: intl.formatMessage({ defaultMessage: '20', description: 'Hour of the day' }) },
              { value: '21', displayName: intl.formatMessage({ defaultMessage: '21', description: 'Hour of the day' }) },
              { value: '22', displayName: intl.formatMessage({ defaultMessage: '22', description: 'Hour of the day' }) },
              { value: '23', displayName: intl.formatMessage({ defaultMessage: '23', description: 'Hour of the day' }) },
            ],
          },
          'x-ms-input-dependencies': {
            type: 'visibility',
            parameters: [
              {
                name: 'recurrence.frequency',
                values: ['Day', 'Week'],
              },
            ],
          },
        },
        minutes: {
          type: 'array',
          title: 'At these minutes',
          description: 'Enter the valid minute values (from 0 to 59) separated by comma, e.g., 15,30',
          'x-ms-editor': 'string',
          'x-ms-editor-options': {
            csvValue: true,
          },
          'x-ms-input-dependencies': {
            type: 'visibility',
            parameters: [
              {
                name: 'recurrence.frequency',
                values: ['Day', 'Week'],
              },
            ],
          },
        },
        weekDays: {
          type: 'array',
          title: 'On these days',
          description: 'Example: Monday, Friday',
          'x-ms-editor': 'dropdown',
          'x-ms-editor-options': {
            multiSelect: true,
            titleSeparator: ',',
            options: [
              { value: 'Monday', displayName: intl.formatMessage({ defaultMessage: 'Monday', description: 'Day of the week' }) },
              { value: 'Tuesday', displayName: intl.formatMessage({ defaultMessage: 'Tuesday', description: 'Day of the week' }) },
              { value: 'Wednesday', displayName: intl.formatMessage({ defaultMessage: 'Wednesday', description: 'Day of the week' }) },
              { value: 'Thursday', displayName: intl.formatMessage({ defaultMessage: 'Thursday', description: 'Day of the week' }) },
              { value: 'Friday', displayName: intl.formatMessage({ defaultMessage: 'Friday', description: 'Day of the week' }) },
              { value: 'Saturday', displayName: intl.formatMessage({ defaultMessage: 'Saturday', description: 'Day of the week' }) },
              { value: 'Sunday', displayName: intl.formatMessage({ defaultMessage: 'Sunday', description: 'Day of the week' }) },
            ],
          },
          'x-ms-input-dependencies': {
            type: 'visibility',
            parameters: [
              {
                name: 'recurrence.frequency',
                values: ['Week'],
              },
            ],
          },
        },
      },
      required: [],
    },
  },
  required: ['frequency', 'interval'],
};

export const getRecurrenceParameters = (recurrence: RecurrenceSetting | undefined, operationDefinition: any): ParameterInfo[] => {
  if (!recurrence || recurrence.type === RecurrenceType.None) {
    return [];
  }

  const schema = recurrence.type === RecurrenceType.Advanced ? advancedRecurrenceSchema : basicRecurrenceSchema;
  const recurrenceParameters = new SchemaProcessor({
    dataKeyPrefix: 'recurrence.$',
    required: true,
    isInputSchema: true,
    keyPrefix: 'recurrence.$',
    expandArrayOutputs: false,
  })
    .getSchemaProperties(schema)
    .map((item) => toInputParameter(item, true /* suppressCasting */));

  if (operationDefinition) {
    for (const parameter of recurrenceParameters) {
      const propertyNames = parseEx(parameter.key.replace('.$', '')).map((segment) => (segment.value ?? '').toString());
      parameter.value = getObjectPropertyValue(operationDefinition, propertyNames);
    }
  } else {
    loadParameterValuesFromDefault(map(recurrenceParameters, OutputMapKey));
  }

  return toParameterInfoMap(recurrenceParameters, operationDefinition);
};
