import type { OperationManifest } from '@microsoft-logic-apps/utils';
import { SettingScope } from '@microsoft-logic-apps/utils';

const frequencyValues = [
  {
    displayName: 'Month',
    value: 'Month',
  },
  {
    displayName: 'Week',
    value: 'Week',
  },
  {
    displayName: 'Day',
    value: 'Day',
  },
  {
    displayName: 'Hour',
    value: 'Hour',
  },
  {
    displayName: 'Minute',
    value: 'Minute',
  },
  {
    displayName: 'Second',
    value: 'Second',
  },
];

const timeZones = [
  {
    value: 'Dateline Standard Time',
    displayName: '(UTC-12:00) International Date Line West',
  },
  {
    value: 'UTC-11',
    displayName: '(UTC-11:00) Coordinated Universal Time-11',
  },
  {
    value: 'Aleutian Standard Time',
    displayName: '(UTC-10:00) Aleutian Islands',
  },
  {
    value: 'Hawaiian Standard Time',
    displayName: '(UTC-10:00) Hawaii',
  },
  {
    value: 'Marquesas Standard Time',
    displayName: '(UTC-09:30) Marquesas Islands',
  },
  {
    value: 'Alaskan Standard Time',
    displayName: '(UTC-09:00) Alaska',
  },
  {
    value: 'UTC-09',
    displayName: '(UTC-09:00) Coordinated Universal Time-09',
  },
  {
    value: 'Pacific Standard Time (Mexico)',
    displayName: '(UTC-08:00) Baja California',
  },
  {
    value: 'UTC-08',
    displayName: '(UTC-08:00) Coordinated Universal Time-08',
  },
  {
    value: 'Pacific Standard Time',
    displayName: '(UTC-08:00) Pacific Time (US & Canada)',
  },
  {
    value: 'US Mountain Standard Time',
    displayName: '(UTC-07:00) Arizona',
  },
  {
    value: 'Mountain Standard Time (Mexico)',
    displayName: '(UTC-07:00) Chihuahua, La Paz, Mazatlan',
  },
  {
    value: 'Mountain Standard Time',
    displayName: '(UTC-07:00) Mountain Time (US & Canada)',
  },
  {
    value: 'Central America Standard Time',
    displayName: '(UTC-06:00) Central America',
  },
  {
    value: 'Central Standard Time',
    displayName: '(UTC-06:00) Central Time (US & Canada)',
  },
  {
    value: 'Easter Island Standard Time',
    displayName: '(UTC-06:00) Easter Island',
  },
  {
    value: 'Central Standard Time (Mexico)',
    displayName: '(UTC-06:00) Guadalajara, Mexico City, Monterrey',
  },
  {
    value: 'Canada Central Standard Time',
    displayName: '(UTC-06:00) Saskatchewan',
  },
  {
    value: 'SA Pacific Standard Time',
    displayName: '(UTC-05:00) Bogota, Lima, Quito, Rio Branco',
  },
  {
    value: 'Eastern Standard Time (Mexico)',
    displayName: '(UTC-05:00) Chetumal',
  },
  {
    value: 'Eastern Standard Time',
    displayName: '(UTC-05:00) Eastern Time (US & Canada)',
  },
  {
    value: 'Haiti Standard Time',
    displayName: '(UTC-05:00) Haiti',
  },
  {
    value: 'Cuba Standard Time',
    displayName: '(UTC-05:00) Havana',
  },
  {
    value: 'US Eastern Standard Time',
    displayName: '(UTC-05:00) Indiana (East)',
  },
  {
    value: 'Paraguay Standard Time',
    displayName: '(UTC-04:00) Asuncion',
  },
  {
    value: 'Atlantic Standard Time',
    displayName: '(UTC-04:00) Atlantic Time (Canada)',
  },
  {
    value: 'Venezuela Standard Time',
    displayName: '(UTC-04:00) Caracas',
  },
  {
    value: 'Central Brazilian Standard Time',
    displayName: '(UTC-04:00) Cuiaba',
  },
  {
    value: 'SA Western Standard Time',
    displayName: '(UTC-04:00) Georgetown, La Paz, Manaus, San Juan',
  },
  {
    value: 'Pacific SA Standard Time',
    displayName: '(UTC-04:00) Santiago',
  },
  {
    value: 'Turks And Caicos Standard Time',
    displayName: '(UTC-04:00) Turks and Caicos',
  },
  {
    value: 'Newfoundland Standard Time',
    displayName: '(UTC-03:30) Newfoundland',
  },
  {
    value: 'Tocantins Standard Time',
    displayName: '(UTC-03:00) Araguaina',
  },
  {
    value: 'E. South America Standard Time',
    displayName: '(UTC-03:00) Brasilia',
  },
  {
    value: 'SA Eastern Standard Time',
    displayName: '(UTC-03:00) Cayenne, Fortaleza',
  },
  {
    value: 'Argentina Standard Time',
    displayName: '(UTC-03:00) City of Buenos Aires',
  },
  {
    value: 'Greenland Standard Time',
    displayName: '(UTC-03:00) Greenland',
  },
  {
    value: 'Montevideo Standard Time',
    displayName: '(UTC-03:00) Montevideo',
  },
  {
    value: 'Saint Pierre Standard Time',
    displayName: '(UTC-03:00) Saint Pierre and Miquelon',
  },
  {
    value: 'Bahia Standard Time',
    displayName: '(UTC-03:00) Salvador',
  },
  {
    value: 'UTC-02',
    displayName: '(UTC-02:00) Coordinated Universal Time-02',
  },
  {
    value: 'Mid-Atlantic Standard Time',
    displayName: '(UTC-02:00) Mid-Atlantic - Old',
  },
  {
    value: 'Azores Standard Time',
    displayName: '(UTC-01:00) Azores',
  },
  {
    value: 'Cape Verde Standard Time',
    displayName: '(UTC-01:00) Cabo Verde Is.',
  },
  {
    value: 'UTC',
    displayName: '(UTC) Coordinated Universal Time',
  },
  {
    value: 'Morocco Standard Time',
    displayName: '(UTC+00:00) Casablanca',
  },
  {
    value: 'GMT Standard Time',
    displayName: '(UTC+00:00) Dublin, Edinburgh, Lisbon, London',
  },
  {
    value: 'Greenwich Standard Time',
    displayName: '(UTC+00:00) Monrovia, Reykjavik',
  },
  {
    value: 'W. Europe Standard Time',
    displayName: '(UTC+01:00) Amsterdam, Berlin, Bern, Rome, Stockholm, Vienna',
  },
  {
    value: 'Central Europe Standard Time',
    displayName: '(UTC+01:00) Belgrade, Bratislava, Budapest, Ljubljana, Prague',
  },
  {
    value: 'Romance Standard Time',
    displayName: '(UTC+01:00) Brussels, Copenhagen, Madrid, Paris',
  },
  {
    value: 'Central European Standard Time',
    displayName: '(UTC+01:00) Sarajevo, Skopje, Warsaw, Zagreb',
  },
  {
    value: 'W. Central Africa Standard Time',
    displayName: '(UTC+01:00) West Central Africa',
  },
  {
    value: 'Namibia Standard Time',
    displayName: '(UTC+01:00) Windhoek',
  },
  {
    value: 'Jordan Standard Time',
    displayName: '(UTC+02:00) Amman',
  },
  {
    value: 'GTB Standard Time',
    displayName: '(UTC+02:00) Athens, Bucharest',
  },
  {
    value: 'Middle East Standard Time',
    displayName: '(UTC+02:00) Beirut',
  },
  {
    value: 'Egypt Standard Time',
    displayName: '(UTC+02:00) Cairo',
  },
  {
    value: 'E. Europe Standard Time',
    displayName: '(UTC+02:00) Chisinau',
  },
  {
    value: 'Syria Standard Time',
    displayName: '(UTC+02:00) Damascus',
  },
  {
    value: 'West Bank Standard Time',
    displayName: '(UTC+02:00) Gaza, Hebron',
  },
  {
    value: 'South Africa Standard Time',
    displayName: '(UTC+02:00) Harare, Pretoria',
  },
  {
    value: 'FLE Standard Time',
    displayName: '(UTC+02:00) Helsinki, Kyiv, Riga, Sofia, Tallinn, Vilnius',
  },
  {
    value: 'Turkey Standard Time',
    displayName: '(UTC+02:00) Istanbul',
  },
  {
    value: 'Israel Standard Time',
    displayName: '(UTC+02:00) Jerusalem',
  },
  {
    value: 'Kaliningrad Standard Time',
    displayName: '(UTC+02:00) Kaliningrad',
  },
  {
    value: 'Libya Standard Time',
    displayName: '(UTC+02:00) Tripoli',
  },
  {
    value: 'Arabic Standard Time',
    displayName: '(UTC+03:00) Baghdad',
  },
  {
    value: 'Arab Standard Time',
    displayName: '(UTC+03:00) Kuwait, Riyadh',
  },
  {
    value: 'Belarus Standard Time',
    displayName: '(UTC+03:00) Minsk',
  },
  {
    value: 'Russian Standard Time',
    displayName: '(UTC+03:00) Moscow, St. Petersburg, Volgograd',
  },
  {
    value: 'E. Africa Standard Time',
    displayName: '(UTC+03:00) Nairobi',
  },
  {
    value: 'Iran Standard Time',
    displayName: '(UTC+03:30) Tehran',
  },
  {
    value: 'Arabian Standard Time',
    displayName: '(UTC+04:00) Abu Dhabi, Muscat',
  },
  {
    value: 'Astrakhan Standard Time',
    displayName: '(UTC+04:00) Astrakhan, Ulyanovsk',
  },
  {
    value: 'Azerbaijan Standard Time',
    displayName: '(UTC+04:00) Baku',
  },
  {
    value: 'Russia Time Zone 3',
    displayName: '(UTC+04:00) Izhevsk, Samara',
  },
  {
    value: 'Mauritius Standard Time',
    displayName: '(UTC+04:00) Port Louis',
  },
  {
    value: 'Georgian Standard Time',
    displayName: '(UTC+04:00) Tbilisi',
  },
  {
    value: 'Caucasus Standard Time',
    displayName: '(UTC+04:00) Yerevan',
  },
  {
    value: 'Afghanistan Standard Time',
    displayName: '(UTC+04:30) Kabul',
  },
  {
    value: 'West Asia Standard Time',
    displayName: '(UTC+05:00) Ashgabat, Tashkent',
  },
  {
    value: 'Ekaterinburg Standard Time',
    displayName: '(UTC+05:00) Ekaterinburg',
  },
  {
    value: 'Pakistan Standard Time',
    displayName: '(UTC+05:00) Islamabad, Karachi',
  },
  {
    value: 'India Standard Time',
    displayName: '(UTC+05:30) Chennai, Kolkata, Mumbai, New Delhi',
  },
  {
    value: 'Sri Lanka Standard Time',
    displayName: '(UTC+05:30) Sri Jayawardenepura',
  },
  {
    value: 'Nepal Standard Time',
    displayName: '(UTC+05:45) Kathmandu',
  },
  {
    value: 'Central Asia Standard Time',
    displayName: '(UTC+06:00) Astana',
  },
  {
    value: 'Bangladesh Standard Time',
    displayName: '(UTC+06:00) Dhaka',
  },
  {
    value: 'N. Central Asia Standard Time',
    displayName: '(UTC+06:00) Novosibirsk',
  },
  {
    value: 'Myanmar Standard Time',
    displayName: '(UTC+06:30) Yangon (Rangoon)',
  },
  {
    value: 'SE Asia Standard Time',
    displayName: '(UTC+07:00) Bangkok, Hanoi, Jakarta',
  },
  {
    value: 'Altai Standard Time',
    displayName: '(UTC+07:00) Barnaul, Gorno-Altaysk',
  },
  {
    value: 'W. Mongolia Standard Time',
    displayName: '(UTC+07:00) Hovd',
  },
  {
    value: 'North Asia Standard Time',
    displayName: '(UTC+07:00) Krasnoyarsk',
  },
  {
    value: 'Tomsk Standard Time',
    displayName: '(UTC+07:00) Tomsk',
  },
  {
    value: 'China Standard Time',
    displayName: '(UTC+08:00) Beijing, Chongqing, Hong Kong, Urumqi',
  },
  {
    value: 'North Asia East Standard Time',
    displayName: '(UTC+08:00) Irkutsk',
  },
  {
    value: 'Singapore Standard Time',
    displayName: '(UTC+08:00) Kuala Lumpur, Singapore',
  },
  {
    value: 'W. Australia Standard Time',
    displayName: '(UTC+08:00) Perth',
  },
  {
    value: 'Taipei Standard Time',
    displayName: '(UTC+08:00) Taipei',
  },
  {
    value: 'Ulaanbaatar Standard Time',
    displayName: '(UTC+08:00) Ulaanbaatar',
  },
  {
    value: 'North Korea Standard Time',
    displayName: '(UTC+08:30) Pyongyang',
  },
  {
    value: 'Aus Central W. Standard Time',
    displayName: '(UTC+08:45) Eucla',
  },
  {
    value: 'Transbaikal Standard Time',
    displayName: '(UTC+09:00) Chita',
  },
  {
    value: 'Tokyo Standard Time',
    displayName: '(UTC+09:00) Osaka, Sapporo, Tokyo',
  },
  {
    value: 'Korea Standard Time',
    displayName: '(UTC+09:00) Seoul',
  },
  {
    value: 'Yakutsk Standard Time',
    displayName: '(UTC+09:00) Yakutsk',
  },
  {
    value: 'Cen. Australia Standard Time',
    displayName: '(UTC+09:30) Adelaide',
  },
  {
    value: 'AUS Central Standard Time',
    displayName: '(UTC+09:30) Darwin',
  },
  {
    value: 'E. Australia Standard Time',
    displayName: '(UTC+10:00) Brisbane',
  },
  {
    value: 'AUS Eastern Standard Time',
    displayName: '(UTC+10:00) Canberra, Melbourne, Sydney',
  },
  {
    value: 'West Pacific Standard Time',
    displayName: '(UTC+10:00) Guam, Port Moresby',
  },
  {
    value: 'Tasmania Standard Time',
    displayName: '(UTC+10:00) Hobart',
  },
  {
    value: 'Vladivostok Standard Time',
    displayName: '(UTC+10:00) Vladivostok',
  },
  {
    value: 'Lord Howe Standard Time',
    displayName: '(UTC+10:30) Lord Howe Island',
  },
  {
    value: 'Bougainville Standard Time',
    displayName: '(UTC+11:00) Bougainville Island',
  },
  {
    value: 'Russia Time Zone 10',
    displayName: '(UTC+11:00) Chokurdakh',
  },
  {
    value: 'Magadan Standard Time',
    displayName: '(UTC+11:00) Magadan',
  },
  {
    value: 'Norfolk Standard Time',
    displayName: '(UTC+11:00) Norfolk Island',
  },
  {
    value: 'Sakhalin Standard Time',
    displayName: '(UTC+11:00) Sakhalin',
  },
  {
    value: 'Central Pacific Standard Time',
    displayName: '(UTC+11:00) Solomon Is., New Caledonia',
  },
  {
    value: 'Russia Time Zone 11',
    displayName: '(UTC+12:00) Anadyr, Petropavlovsk-Kamchatsky',
  },
  {
    value: 'New Zealand Standard Time',
    displayName: '(UTC+12:00) Auckland, Wellington',
  },
  {
    value: 'UTC+12',
    displayName: '(UTC+12:00) Coordinated Universal Time+12',
  },
  {
    value: 'Fiji Standard Time',
    displayName: '(UTC+12:00) Fiji',
  },
  {
    value: 'Kamchatka Standard Time',
    displayName: '(UTC+12:00) Petropavlovsk-Kamchatsky - Old',
  },
  {
    value: 'Chatham Islands Standard Time',
    displayName: '(UTC+12:45) Chatham Islands',
  },
  {
    value: 'Tonga Standard Time',
    displayName: "(UTC+13:00) Nuku'alofa",
  },
  {
    value: 'Samoa Standard Time',
    displayName: '(UTC+13:00) Samoa',
  },
  {
    value: 'Line Islands Standard Time',
    displayName: '(UTC+14:00) Kiritimati Island',
  },
];

const dateTimeFormats = [
  {
    value: 'd',
    displayName: 'Short date pattern - 6/15/2009 [d]',
  },
  {
    value: 'D',
    displayName: 'Long date pattern - Monday, June 15, 2009 [D]',
  },
  {
    value: 'f',
    displayName: 'Full date/time pattern (short time) - Monday, June 15, 2009 1:45 PM [f]',
  },
  {
    value: 'F',
    displayName: 'Full date/time pattern (long time) - Monday, June 15, 2009 1:45:30 PM [F]',
  },
  {
    value: 'g',
    displayName: 'General date/time pattern (short time) - 6/15/2009 1:45 PM [g]',
  },
  {
    value: 'G',
    displayName: 'General date/time pattern (long time) - 6/15/2009 1:45:30 PM [G]',
  },
  {
    value: 'm',
    displayName: 'Month/day pattern - June 15 [m]',
  },
  {
    value: 'o',
    displayName: 'Round-trip date/time pattern - 2009-06-15T13:45:30.0000000-07:00 [o]',
  },
  {
    value: 'r',
    displayName: 'RFC1123 pattern - Mon, 15 Jun 2009 20:45:30 GMT [r]',
  },
  {
    value: 's',
    displayName: 'Sortable date/time pattern - 2009-06-15T13:45:30 [s]',
  },
  {
    value: 't',
    displayName: 'Short time pattern - 1:45 PM [t]',
  },
  {
    value: 'T',
    displayName: 'Long time pattern - 1:45:30 PM [T]',
  },
  {
    value: 'u',
    displayName: 'Universal sortable date/time pattern - 2009-06-15 13:45:30Z [u]',
  },
  {
    value: 'U',
    displayName: 'Universal full date/time pattern - Monday, June 15, 2009 8:45:30 PM [U]',
  },
  {
    value: 'y',
    displayName: 'Year month pattern - June, 2009 [y]',
  },
];

const dateTimeConnector = {
  id: 'connectionProviders/datetime',
  name: 'datetime',
  properties: {
    description: 'Date Time operations',
    displayName: 'Date Time',
  },
} as any;

const dateTimeIcon =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZlcnNpb249IjEuMSIgdmlld0JveD0iMCAwIDMyIDMyIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPg0KIDxwYXRoIGQ9Im0wIDBoMzJ2MzJoLTMyeiIgZmlsbD0iIzFGODVGRiIvPg0KIDxnIGZpbGw9IiNmZmYiPg0KICA8cGF0aCBkPSJNMTYuMDE1IDEwLjEzOGMtMy44NC0uMDA3LTYuOTUzIDMuMTA2LTYuOTQ2IDYuOTMxLjAwNyAzLjgzMyAzLjEwNiA2LjkzMSA2LjkyNCA2LjkzMSAzLjgxOCAwIDYuOTMxLTMuMTA2IDYuOTM4LTYuOTI0LjAwNy0zLjgxMS0zLjEwNi02LjkzOC02LjkxNy02LjkzOHptLS4wMjkgMTIuMzI4Yy0zLjA3Ni0uMDE1LTUuMzk2LTIuNDk1LTUuMzgyLTUuNDE4LjAxNS0zLjA5OCAyLjU5Ni01LjQ2MiA1LjYwNy01LjM3NSAyLjgxNS4wODcgNS4yMDcgMi41MzEgNS4xNzggNS4zOTYtLjAwNyAyLjk4OS0yLjM5MyA1LjQxMS01LjQwNCA1LjM5NnoiLz4NCiAgPHBhdGggZD0iTTIxLjk0OSAxMi4xMzhjLjEzOC0uMzQ5LjI2Mi0uNjkxLjQxNS0xLjAxOC4yNC0uNTAyLjEwOS0uOTM4LS4yNjItMS4yODctLjg4LS44MzYtMS45MTMtMS40MzMtMy4wODQtMS43NjctLjM2NC0uMTAyLS43NjQtLjExNi0xLjA0LjE5Ni0uMzEzLjM0OS0uNTc1Ljc0OS0uODczIDEuMTQ5IDEuOTQyLjM1NiAzLjUyNyAxLjI4IDQuODQ0IDIuNzI3eiIvPg0KICA8cGF0aCBkPSJNMTAuMDI5IDEyLjExNmMxLjMwOS0xLjQ2MiAyLjg5NS0yLjM2NCA0LjgxNS0yLjcyNy0uMjMzLS4zMjctLjQ1OC0uNjE4LS42NTUtLjkxNi0uMjY5LS40MjItLjY1NS0uNTMxLTEuMTEzLS40NDQtMS4wNC4yMDQtMS45MTMuNzU2LTIuNzU2IDEuMzY3LS4xODIuMTMxLS4zNDkuMjk4LS41MDIuNDY1LS4yNjIuMjg0LS40MDcuNjE4LS4yOTEuOTk2LjEzOC40MTUuMzI3LjgyMi41MDIgMS4yNTh6Ii8+DQogIDxwYXRoIGQ9Ik0xNi41MTYgMTIuOTIzYy0uNjA0LS4zMjctMS4yNjUuMDUxLTEuMjY1LjczNS4wMDcuOTY3LjAxNSAxLjkzNS4wMzYgMi45MDkuMDA3LjE4OS0uMDQ0LjMyNy0uMTk2LjQ1OC0uMzg1LjMyLS43NzEuNjQ3LTEuMTM1Ljk4OS0uMzEzLjI5MS0uMzA1LjczNS0uMDE1IDEuMDU1LjI4NC4zMTMuNzQyLjM2NCAxLjA1NS4wOTUuNTM4LS40NjUgMS4wNjktLjkzMSAxLjU4NS0xLjQxOC4xMDktLjEwMi4yMTEtLjI5MS4yMTEtLjQzNi4wMjItLjY3Ni4wMDctMS4zNi4wMDctMi4wMzZoLjAzNnYtMS43MzFjLjAwNy0uMjY5LS4wNzMtLjQ4LS4zMi0uNjE4eiIvPg0KIDwvZz4NCjwvc3ZnPg0K';
const dateTimeBrandColor = '#1F85FF';

export const addToTimeManifest = {
  properties: {
    iconUri: dateTimeIcon,
    brandColor: dateTimeBrandColor,
    description: 'Adds a time span to a specified time.',
    summary: 'Add to time',

    inputs: {
      type: 'object',
      properties: {
        baseTime: {
          type: 'string',
          title: 'Base time',
          description: 'The time to add the interval to.',
        },
        interval: {
          type: 'integer',
          title: 'Interval',
          description: 'Specify the interval of time to add to the base time',
        },
        timeUnit: {
          type: 'string',
          title: 'Time unit',
          description: 'The unit of time the interval is specified in.',
          'x-ms-editor': 'combobox',
          'x-ms-editor-options': {
            options: frequencyValues,
          },
          default: 'Hour',
        },
      },
      required: ['baseTime', 'interval', 'timeUnit'],
    },
    inputsLocation: ['inputs'],

    outputs: {
      type: 'object',
      required: ['body'],
      properties: {
        body: {
          type: 'string',
          title: 'Calculated time',
        },
      },
    },
    isOutputsOptional: false,

    connector: dateTimeConnector,

    settings: {
      trackedProperties: {
        scopes: [SettingScope.Action],
      },
    },
  },
} as OperationManifest;

export const convertTimezoneManifest = {
  properties: {
    iconUri: dateTimeIcon,
    brandColor: dateTimeBrandColor,
    description: 'Converts a time to a specified target time zone',
    summary: 'Convert time zone',

    inputs: {
      type: 'object',
      properties: {
        baseTime: {
          type: 'string',
          title: 'Base time',
          description: 'The time to convert.',
        },
        sourceTimeZone: {
          type: 'string',
          title: 'Source time zone',
          description: 'The time zone the base time is in.',
          'x-ms-editor': 'combobox',
          'x-ms-editor-options': {
            options: timeZones,
          },
          default: 'UTC',
        },
        destinationTimeZone: {
          type: 'string',
          title: 'Destination time zone',
          description: 'The time zone to convert to.',
          'x-ms-editor': 'combobox',
          'x-ms-editor-options': {
            options: timeZones,
          },
          default: 'UTC',
        },
        formatString: {
          type: 'string',
          title: 'Time unit',
          description: 'A string specifying the desired format of the converted time.',
          'x-ms-visibility': 'important',
          'x-ms-editor': 'combobox',
          'x-ms-editor-options': {
            options: dateTimeFormats,
          },
          default: 'd',
        },
      },
      required: ['baseTime', 'sourceTimeZone', 'destinationTimeZone'],
    },
    inputsLocation: ['inputs'],

    outputs: {
      type: 'object',
      required: ['body'],
      properties: {
        body: {
          type: 'string',
          title: 'Converted time',
        },
      },
    },
    isOutputsOptional: false,

    connector: dateTimeConnector,

    settings: {
      trackedProperties: {
        scopes: [SettingScope.Action],
      },
    },
  },
} as OperationManifest;

export const currentTimeManifest = {
  properties: {
    iconUri: dateTimeIcon,
    brandColor: dateTimeBrandColor,
    description: 'Gets the current time in UTC.',
    summary: 'Current time',

    outputs: {
      type: 'object',
      required: ['body'],
      properties: {
        body: {
          type: 'string',
          title: 'Current time',
        },
      },
    },
    isOutputsOptional: false,

    connector: dateTimeConnector,

    settings: {
      trackedProperties: {
        scopes: [SettingScope.Action],
      },
    },
  },
} as OperationManifest;

export const getFutureTimeManifest = {
  properties: {
    iconUri: dateTimeIcon,
    brandColor: dateTimeBrandColor,
    description: 'Returns a timestamp that is the current time plus the specified time interval.',
    summary: 'Get future time',

    inputs: {
      type: 'object',
      properties: {
        interval: {
          type: 'integer',
          title: 'Interval',
          description: 'Specify the time interval between the current time and the desired future time.',
        },
        timeUnit: {
          type: 'string',
          title: 'Time unit',
          description: 'The unit of time the interval is specified in.',
          'x-ms-editor': 'combobox',
          'x-ms-editor-options': {
            options: frequencyValues,
          },
          default: 'Hour',
        },
      },
      required: ['interval', 'timeUnit'],
    },
    inputsLocation: ['inputs'],

    outputs: {
      type: 'object',
      required: ['body'],
      properties: {
        body: {
          type: 'string',
          title: 'Future time',
        },
      },
    },
    isOutputsOptional: false,

    connector: dateTimeConnector,

    settings: {
      trackedProperties: {
        scopes: [SettingScope.Action],
      },
    },
  },
} as OperationManifest;

export const getPastTimeManifest = {
  properties: {
    iconUri: dateTimeIcon,
    brandColor: dateTimeBrandColor,
    description: 'Returns a timestamp that is the current time minus the specified time interval.',
    summary: 'Get past time',

    inputs: {
      type: 'object',
      properties: {
        interval: {
          type: 'integer',
          title: 'Interval',
          description: 'Specify the time interval between the current time and the desired time in the past.',
        },
        timeUnit: {
          type: 'string',
          title: 'Time unit',
          description: 'The unit of time the interval is specified in.',
          'x-ms-editor': 'combobox',
          'x-ms-editor-options': {
            options: frequencyValues,
          },
          default: 'Hour',
        },
      },
      required: ['interval', 'timeUnit'],
    },
    inputsLocation: ['inputs'],

    outputs: {
      type: 'object',
      required: ['body'],
      properties: {
        body: {
          type: 'string',
          title: 'Past time',
        },
      },
    },
    isOutputsOptional: false,

    connector: dateTimeConnector,

    settings: {
      trackedProperties: {
        scopes: [SettingScope.Action],
      },
    },
  },
} as OperationManifest;

export const subtractFromTimeManifest = {
  properties: {
    iconUri: dateTimeIcon,
    brandColor: dateTimeBrandColor,
    description: 'Subtracts a time span from a specified time.',
    summary: 'Subtract from time',

    inputs: {
      type: 'object',
      properties: {
        baseTime: {
          type: 'string',
          title: 'Base time',
          description: 'The time to subtract the interval from.',
        },
        interval: {
          type: 'integer',
          title: 'Interval',
          description: 'Specify the interval of time to subtract from the base time.',
        },
        timeUnit: {
          type: 'string',
          title: 'Time unit',
          description: 'The unit of time the interval is specified in.',
          'x-ms-editor': 'combobox',
          'x-ms-editor-options': {
            options: frequencyValues,
          },
          default: 'Hour',
        },
      },
      required: ['baseTime', 'interval', 'timeUnit'],
    },
    inputsLocation: ['inputs'],

    outputs: {
      type: 'object',
      required: ['body'],
      properties: {
        body: {
          type: 'string',
          title: 'Calculated time',
        },
      },
    },
    isOutputsOptional: false,

    connector: dateTimeConnector,

    settings: {
      trackedProperties: {
        scopes: [SettingScope.Action],
      },
    },
  },
} as OperationManifest;
