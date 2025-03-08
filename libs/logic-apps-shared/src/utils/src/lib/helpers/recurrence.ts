import type { IntlShape } from 'react-intl';

export const getFrequencyValues = (intl: IntlShape) => {
  return [
    {
      displayName: intl.formatMessage({ defaultMessage: 'Month', id: 'HH970i', description: 'Frequency value ' }),
      value: 'Month',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: 'Week', id: 'V5f3ha', description: 'Frequency value ' }),
      value: 'Week',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: 'Day', id: '5dCAjy', description: 'Frequency value ' }),
      value: 'Day',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: 'Hour', id: '0upuCv', description: 'Frequency value ' }),
      value: 'Hour',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: 'Minute', id: 'X/7je+', description: 'Frequency value ' }),
      value: 'Minute',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: 'Second', id: 'aV/nLS', description: 'Frequency value ' }),
      value: 'Second',
    },
  ];
};

export const getTimezoneValues = (intl: IntlShape) => {
  return [
    {
      displayName: intl.formatMessage({
        defaultMessage: '(UTC-12:00) International Date Line West',
        id: 'IS4vNX',
        description: 'Time zone value ',
      }),
      value: 'Dateline Standard Time',
    },
    {
      displayName: intl.formatMessage({
        defaultMessage: '(UTC-11:00) Coordinated Universal Time-11',
        id: 'I41vZ/',
        description: 'Time zone value ',
      }),
      value: 'UTC-11',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-10:00) Aleutian Islands', id: 'jQ7UzV', description: 'Time zone value ' }),
      value: 'Aleutian Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-10:00) Hawaii', id: 'Q+ZZHI', description: 'Time zone value ' }),
      value: 'Hawaiian Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-09:30) Marquesas Islands', id: 'wtj07J', description: 'Time zone value ' }),
      value: 'Marquesas Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-09:00) Alaska', id: 'JzRzVp', description: 'Time zone value ' }),
      value: 'Alaskan Standard Time',
    },
    {
      displayName: intl.formatMessage({
        defaultMessage: '(UTC-09:00) Coordinated Universal Time-09',
        id: 'u81zB9',
        description: 'Time zone value ',
      }),
      value: 'UTC-09',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-08:00) Baja California', id: 'oO12r6', description: 'Time zone value ' }),
      value: 'Pacific Standard Time (Mexico)',
    },
    {
      displayName: intl.formatMessage({
        defaultMessage: '(UTC-08:00) Coordinated Universal Time-08',
        id: 'IAmvpa',
        description: 'Time zone value ',
      }),
      value: 'UTC-08',
    },
    {
      displayName: intl.formatMessage({
        defaultMessage: '(UTC-08:00) Pacific Time (US & Canada)',
        id: 'tZIlCA',
        description: 'Time zone value ',
      }),
      value: 'Pacific Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-07:00) Arizona', id: 'DEu7oK', description: 'Time zone value ' }),
      value: 'US Mountain Standard Time',
    },
    {
      displayName: intl.formatMessage({
        defaultMessage: '(UTC-07:00) Chihuahua, La Paz, Mazatlan',
        id: 'FL/0Zp',
        description: 'Time zone value ',
      }),
      value: 'Mountain Standard Time (Mexico)',
    },
    {
      displayName: intl.formatMessage({
        defaultMessage: '(UTC-07:00) Mountain Time (US & Canada)',
        id: 'UT2ozj',
        description: 'Time zone value ',
      }),
      value: 'Mountain Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-06:00) Central America', id: 'eFnLWK', description: 'Time zone value ' }),
      value: 'Central America Standard Time',
    },
    {
      displayName: intl.formatMessage({
        defaultMessage: '(UTC-06:00) Central Time (US & Canada)',
        id: '83PYuA',
        description: 'Time zone value ',
      }),
      value: 'Central Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-06:00) Easter Island', id: 'TjMkDP', description: 'Time zone value ' }),
      value: 'Easter Island Standard Time',
    },
    {
      displayName: intl.formatMessage({
        defaultMessage: '(UTC-06:00) Guadalajara, Mexico City, Monterrey',
        id: 'ginGIZ',
        description: 'Time zone value ',
      }),
      value: 'Central Standard Time (Mexico)',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-06:00) Saskatchewan', id: '/RS9F7', description: 'Time zone value ' }),
      value: 'Canada Central Standard Time',
    },
    {
      displayName: intl.formatMessage({
        defaultMessage: '(UTC-05:00) Bogota, Lima, Quito, Rio Branco',
        id: 'kSK9Pq',
        description: 'Time zone value ',
      }),
      value: 'SA Pacific Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-05:00) Chetumal', id: 'sFbnCs', description: 'Time zone value ' }),
      value: 'Eastern Standard Time (Mexico)',
    },
    {
      displayName: intl.formatMessage({
        defaultMessage: '(UTC-05:00) Eastern Time (US & Canada)',
        id: '7PtWvu',
        description: 'Time zone value ',
      }),
      value: 'Eastern Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-05:00) Haiti', id: 'fVG5aD', description: 'Time zone value ' }),
      value: 'Haiti Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-05:00) Havana', id: 'Cb6IEq', description: 'Time zone value ' }),
      value: 'Cuba Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-05:00) Indiana (East)', id: 'Xv5CGN', description: 'Time zone value ' }),
      value: 'US Eastern Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-04:00) Asuncion', id: '/km5eO', description: 'Time zone value ' }),
      value: 'Paraguay Standard Time',
    },
    {
      displayName: intl.formatMessage({
        defaultMessage: '(UTC-04:00) Atlantic Time (Canada)',
        id: 'YZ5Kwe',
        description: 'Time zone value ',
      }),
      value: 'Atlantic Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-04:00) Caracas', id: 'zkeKWE', description: 'Time zone value ' }),
      value: 'Venezuela Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-04:00) Cuiaba', id: 'cyEBus', description: 'Time zone value ' }),
      value: 'Central Brazilian Standard Time',
    },
    {
      displayName: intl.formatMessage({
        defaultMessage: '(UTC-04:00) Georgetown, La Paz, Manaus, San Juan',
        id: 'NGJ00e',
        description: 'Time zone value ',
      }),
      value: 'SA Western Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-04:00) Santiago', id: 'n42uAO', description: 'Time zone value ' }),
      value: 'Pacific SA Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-04:00) Turks and Caicos', id: '7EZ2oY', description: 'Time zone value ' }),
      value: 'Turks And Caicos Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-03:30) Newfoundland', id: 'fifSPb', description: 'Time zone value ' }),
      value: 'Newfoundland Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-03:00) Araguaina', id: 'NMpFs6', description: 'Time zone value ' }),
      value: 'Tocantins Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-03:00) Brasilia', id: '9LLnyJ', description: 'Time zone value ' }),
      value: 'E. South America Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-03:00) Cayenne, Fortaleza', id: 'LdITnG', description: 'Time zone value ' }),
      value: 'SA Eastern Standard Time',
    },
    {
      displayName: intl.formatMessage({
        defaultMessage: '(UTC-03:00) City of Buenos Aires',
        id: 'GE14Xd',
        description: 'Time zone value ',
      }),
      value: 'Argentina Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-03:00) Greenland', id: 'uh/+ZN', description: 'Time zone value ' }),
      value: 'Greenland Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-03:00) Montevideo', id: 'X2idLs', description: 'Time zone value ' }),
      value: 'Montevideo Standard Time',
    },
    {
      displayName: intl.formatMessage({
        defaultMessage: '(UTC-03:00) Saint Pierre and Miquelon',
        id: 'xSSfKC',
        description: 'Time zone value ',
      }),
      value: 'Saint Pierre Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-03:00) Salvador', id: '3MTSYZ', description: 'Time zone value ' }),
      value: 'Bahia Standard Time',
    },
    {
      displayName: intl.formatMessage({
        defaultMessage: '(UTC-02:00) Coordinated Universal Time-02',
        id: 'HYhDYB',
        description: 'Time zone value ',
      }),
      value: 'UTC-02',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-02:00) Mid-Atlantic - Old', id: 'Cb8pv0', description: 'Time zone value ' }),
      value: 'Mid-Atlantic Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-01:00) Azores', id: '1hHFdx', description: 'Time zone value ' }),
      value: 'Azores Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-01:00) Cabo Verde Is.', id: 'yVFIAQ', description: 'Time zone value ' }),
      value: 'Cape Verde Standard Time',
    },
    {
      displayName: intl.formatMessage({
        defaultMessage: '(UTC) Coordinated Universal Time',
        id: 'uE0A0s',
        description: 'Time zone value ',
      }),
      value: 'UTC',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+00:00) Casablanca', id: 'hza/cT', description: 'Time zone value ' }),
      value: 'Morocco Standard Time',
    },
    {
      displayName: intl.formatMessage({
        defaultMessage: '(UTC+00:00) Dublin, Edinburgh, Lisbon, London',
        id: '2hrQOL',
        description: 'Time zone value ',
      }),
      value: 'GMT Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+00:00) Monrovia, Reykjavik', id: 'Rp5pHU', description: 'Time zone value ' }),
      value: 'Greenwich Standard Time',
    },
    {
      displayName: intl.formatMessage({
        defaultMessage: '(UTC+01:00) Amsterdam, Berlin, Bern, Rome, Stockholm, Vienna',
        id: 'x3dWOL',
        description: 'Time zone value ',
      }),
      value: 'W. Europe Standard Time',
    },
    {
      displayName: intl.formatMessage({
        defaultMessage: '(UTC+01:00) Belgrade, Bratislava, Budapest, Ljubljana, Prague',
        id: 'LV3k48',
        description: 'Time zone value ',
      }),
      value: 'Central Europe Standard Time',
    },
    {
      displayName: intl.formatMessage({
        defaultMessage: '(UTC+01:00) Brussels, Copenhagen, Madrid, Paris',
        id: 'YiOybp',
        description: 'Time zone value ',
      }),
      value: 'Romance Standard Time',
    },
    {
      displayName: intl.formatMessage({
        defaultMessage: '(UTC+01:00) Sarajevo, Skopje, Warsaw, Zagreb',
        id: 'yucvJE',
        description: 'Time zone value ',
      }),
      value: 'Central European Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+01:00) West Central Africa', id: 'EaTGcN', description: 'Time zone value ' }),
      value: 'W. Central Africa Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+01:00) Windhoek', id: 'l/9YHQ', description: 'Time zone value ' }),
      value: 'Namibia Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+02:00) Amman', id: 'PjBcG3', description: 'Time zone value ' }),
      value: 'Jordan Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+02:00) Athens, Bucharest', id: 'zOvGF8', description: 'Time zone value ' }),
      value: 'GTB Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+02:00) Beirut', id: 'KlDW+5', description: 'Time zone value ' }),
      value: 'Middle East Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+02:00) Cairo', id: 'Pq+4a+', description: 'Time zone value ' }),
      value: 'Egypt Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+02:00) Chisinau', id: 'DYXoEM', description: 'Time zone value ' }),
      value: 'E. Europe Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+02:00) Damascus', id: 'Lx8HRl', description: 'Time zone value ' }),
      value: 'Syria Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+02:00) Gaza, Hebron', id: 'hZqQdt', description: 'Time zone value ' }),
      value: 'West Bank Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+02:00) Harare, Pretoria', id: 'i1EQYm', description: 'Time zone value ' }),
      value: 'South Africa Standard Time',
    },
    {
      displayName: intl.formatMessage({
        defaultMessage: '(UTC+02:00) Helsinki, Kyiv, Riga, Sofia, Tallinn, Vilnius',
        id: 'N7E9hd',
        description: 'Time zone value ',
      }),
      value: 'FLE Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+02:00) Istanbul', id: 'xJQeeC', description: 'Time zone value ' }),
      value: 'Turkey Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+02:00) Jerusalem', id: 'IPwWgu', description: 'Time zone value ' }),
      value: 'Israel Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+02:00) Kaliningrad', id: 'TlX98E', description: 'Time zone value ' }),
      value: 'Kaliningrad Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+02:00) Tripoli', id: 'FxQ2Ts', description: 'Time zone value ' }),
      value: 'Libya Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+03:00) Baghdad', id: 'XQ4OCV', description: 'Time zone value ' }),
      value: 'Arabic Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+03:00) Kuwait, Riyadh', id: 'p5ZID0', description: 'Time zone value ' }),
      value: 'Arab Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+03:00) Minsk', id: '1KFpTX', description: 'Time zone value ' }),
      value: 'Belarus Standard Time',
    },
    {
      displayName: intl.formatMessage({
        defaultMessage: '(UTC+03:00) Moscow, St. Petersburg, Volgograd',
        id: 'IxWip7',
        description: 'Time zone value ',
      }),
      value: 'Russian Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+03:00) Nairobi', id: 'XOAcjQ', description: 'Time zone value ' }),
      value: 'E. Africa Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+03:30) Tehran', id: 'o7bd1o', description: 'Time zone value ' }),
      value: 'Iran Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+04:00) Abu Dhabi, Muscat', id: 'kVwJXt', description: 'Time zone value ' }),
      value: 'Arabian Standard Time',
    },
    {
      displayName: intl.formatMessage({
        defaultMessage: '(UTC+04:00) Astrakhan, Ulyanovsk',
        id: 'WR1K3z',
        description: 'Time zone value ',
      }),
      value: 'Astrakhan Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+04:00) Baku', id: 'MPPyI6', description: 'Time zone value ' }),
      value: 'Azerbaijan Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+04:00) Izhevsk, Samara', id: 'BogxJl', description: 'Time zone value ' }),
      value: 'Russia Time Zone 3',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+04:00) Port Louis', id: 'rxMXmZ', description: 'Time zone value ' }),
      value: 'Mauritius Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+04:00) Tbilisi', id: '06zKZg', description: 'Time zone value ' }),
      value: 'Georgian Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+04:00) Yerevan', id: 'RJes1w', description: 'Time zone value ' }),
      value: 'Caucasus Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+04:30) Kabul', id: 'wxaQwD', description: 'Time zone value ' }),
      value: 'Afghanistan Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+05:00) Ashgabat, Tashkent', id: 'gWyYg0', description: 'Time zone value ' }),
      value: 'West Asia Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+05:00) Ekaterinburg', id: 'U0I10w', description: 'Time zone value ' }),
      value: 'Ekaterinburg Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+05:00) Islamabad, Karachi', id: '/NtebP', description: 'Time zone value ' }),
      value: 'Pakistan Standard Time',
    },
    {
      displayName: intl.formatMessage({
        defaultMessage: '(UTC+05:30) Chennai, Kolkata, Mumbai, New Delhi',
        id: 'YgU88A',
        description: 'Time zone value ',
      }),
      value: 'India Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+05:30) Sri Jayawardenepura', id: '0B5xDu', description: 'Time zone value ' }),
      value: 'Sri Lanka Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+05:45) Kathmandu', id: 'njGstq', description: 'Time zone value ' }),
      value: 'Nepal Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+06:00) Astana', id: '8ZfbyZ', description: 'Time zone value ' }),
      value: 'Central Asia Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+06:00) Dhaka', id: 'P/dnfK', description: 'Time zone value ' }),
      value: 'Bangladesh Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+06:00) Novosibirsk', id: 'VPh9Jo', description: 'Time zone value ' }),
      value: 'N. Central Asia Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+06:30) Yangon (Rangoon)', id: 'uwuGU0', description: 'Time zone value ' }),
      value: 'Myanmar Standard Time',
    },
    {
      displayName: intl.formatMessage({
        defaultMessage: '(UTC+07:00) Bangkok, Hanoi, Jakarta',
        id: 'uNHpGB',
        description: 'Time zone value ',
      }),
      value: 'SE Asia Standard Time',
    },
    {
      displayName: intl.formatMessage({
        defaultMessage: '(UTC+07:00) Barnaul, Gorno-Altaysk',
        id: 'mCKsFw',
        description: 'Time zone value ',
      }),
      value: 'Altai Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+07:00) Hovd', id: 'Pudllg', description: 'Time zone value ' }),
      value: 'W. Mongolia Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+07:00) Krasnoyarsk', id: 'XTeLIw', description: 'Time zone value ' }),
      value: 'North Asia Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+07:00) Tomsk', id: 'e4JZEY', description: 'Time zone value ' }),
      value: 'Tomsk Standard Time',
    },
    {
      displayName: intl.formatMessage({
        defaultMessage: '(UTC+08:00) Beijing, Chongqing, Hong Kong, Urumqi',
        id: 'fp8Ry3',
        description: 'Time zone value ',
      }),
      value: 'China Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+08:00) Irkutsk', id: '8eKf/c', description: 'Time zone value ' }),
      value: 'North Asia East Standard Time',
    },
    {
      displayName: intl.formatMessage({
        defaultMessage: '(UTC+08:00) Kuala Lumpur, Singapore',
        id: '+mAJR3',
        description: 'Time zone value ',
      }),
      value: 'Singapore Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+08:00) Perth', id: '1eKQwo', description: 'Time zone value ' }),
      value: 'W. Australia Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+08:00) Taipei', id: 'OgJ9eG', description: 'Time zone value ' }),
      value: 'Taipei Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+08:00) Ulaanbaatar', id: 'Bl4Iv0', description: 'Time zone value ' }),
      value: 'Ulaanbaatar Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+08:30) Pyongyang', id: 'mej02C', description: 'Time zone value ' }),
      value: 'North Korea Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+08:45) Eucla', id: '5+P3ef', description: 'Time zone value ' }),
      value: 'Aus Central W. Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+09:00) Chita', id: 'sZHTQV', description: 'Time zone value ' }),
      value: 'Transbaikal Standard Time',
    },
    {
      displayName: intl.formatMessage({
        defaultMessage: '(UTC+09:00) Osaka, Sapporo, Tokyo',
        id: '595Baw',
        description: 'Time zone value ',
      }),
      value: 'Tokyo Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+09:00) Seoul', id: 'cHiBAn', description: 'Time zone value ' }),
      value: 'Korea Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+09:00) Yakutsk', id: 'If+p6C', description: 'Time zone value ' }),
      value: 'Yakutsk Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+09:30) Adelaide', id: 'Cy0pyB', description: 'Time zone value ' }),
      value: 'Cen. Australia Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+09:30) Darwin', id: 'rxIJfD', description: 'Time zone value ' }),
      value: 'AUS Central Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+10:00) Brisbane', id: 'no/SMg', description: 'Time zone value ' }),
      value: 'E. Australia Standard Time',
    },
    {
      displayName: intl.formatMessage({
        defaultMessage: '(UTC+10:00) Canberra, Melbourne, Sydney',
        id: '43xObP',
        description: 'Time zone value ',
      }),
      value: 'AUS Eastern Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+10:00) Guam, Port Moresby', id: 'MOsuw2', description: 'Time zone value ' }),
      value: 'West Pacific Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+10:00) Hobart', id: 'c3FLox', description: 'Time zone value ' }),
      value: 'Tasmania Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+10:00) Vladivostok', id: 'NnrHK3', description: 'Time zone value ' }),
      value: 'Vladivostok Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+10:30) Lord Howe Island', id: '3n5pnv', description: 'Time zone value ' }),
      value: 'Lord Howe Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+11:00) Bougainville Island', id: 'Af+Ve0', description: 'Time zone value ' }),
      value: 'Bougainville Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+11:00) Chokurdakh', id: 'tUU4ak', description: 'Time zone value ' }),
      value: 'Russia Time Zone 10',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+11:00) Magadan', id: 'usCZ7R', description: 'Time zone value ' }),
      value: 'Magadan Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+11:00) Norfolk Island', id: 'OhbvXz', description: 'Time zone value ' }),
      value: 'Norfolk Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+11:00) Sakhalin', id: 'E8iqLl', description: 'Time zone value ' }),
      value: 'Sakhalin Standard Time',
    },
    {
      displayName: intl.formatMessage({
        defaultMessage: '(UTC+11:00) Solomon Is., New Caledonia',
        id: 'RvpHdu',
        description: 'Time zone value ',
      }),
      value: 'Central Pacific Standard Time',
    },
    {
      displayName: intl.formatMessage({
        defaultMessage: '(UTC+12:00) Anadyr, Petropavlovsk-Kamchatsky',
        id: '07oZoX',
        description: 'Time zone value ',
      }),
      value: 'Russia Time Zone 11',
    },
    {
      displayName: intl.formatMessage({
        defaultMessage: '(UTC+12:00) Auckland, Wellington',
        id: 'Ci41Od',
        description: 'Time zone value ',
      }),
      value: 'New Zealand Standard Time',
    },
    {
      displayName: intl.formatMessage({
        defaultMessage: '(UTC+12:00) Coordinated Universal Time+12',
        id: 'R/aiRy',
        description: 'Time zone value ',
      }),
      value: 'UTC+12',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+12:00) Fiji', id: 'LCRHQ9', description: 'Time zone value ' }),
      value: 'Fiji Standard Time',
    },
    {
      displayName: intl.formatMessage({
        defaultMessage: '(UTC+12:00) Petropavlovsk-Kamchatsky - Old',
        id: 'zViEGr',
        description: 'Time zone value ',
      }),
      value: 'Kamchatka Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+12:45) Chatham Islands', id: 'tqqUHX', description: 'Time zone value ' }),
      value: 'Chatham Islands Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: `(UTC+13:00) Nuku'alofa`, id: 'lM9qrG', description: 'Time zone value ' }),
      value: 'Tonga Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+13:00) Samoa', id: 'CaajcD', description: 'Time zone value ' }),
      value: 'Samoa Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+14:00) Kiritimati Island', id: 'nVDG00', description: 'Time zone value ' }),
      value: 'Line Islands Standard Time',
    },
  ];
};

export const getScheduleHourValues = (intl: IntlShape) => {
  return [
    { value: '0', displayName: intl.formatMessage({ defaultMessage: '0', id: '/qu3zt', description: 'Hour of the day' }) },
    { value: '1', displayName: intl.formatMessage({ defaultMessage: '1', id: 'EdzoIs', description: 'Hour of the day' }) },
    { value: '2', displayName: intl.formatMessage({ defaultMessage: '2', id: 'FiyQjU', description: 'Hour of the day' }) },
    { value: '3', displayName: intl.formatMessage({ defaultMessage: '3', id: '3vqfeV', description: 'Hour of the day' }) },
    { value: '4', displayName: intl.formatMessage({ defaultMessage: '4', id: 'urAHv1', description: 'Hour of the day' }) },
    { value: '5', displayName: intl.formatMessage({ defaultMessage: '5', id: '1uGBLP', description: 'Hour of the day' }) },
    { value: '6', displayName: intl.formatMessage({ defaultMessage: '6', id: 'RkgScy', description: 'Hour of the day' }) },
    { value: '7', displayName: intl.formatMessage({ defaultMessage: '7', id: 'n20T2h', description: 'Hour of the day' }) },
    { value: '8', displayName: intl.formatMessage({ defaultMessage: '8', id: 'yVh9kr', description: 'Hour of the day' }) },
    { value: '9', displayName: intl.formatMessage({ defaultMessage: '9', id: 'cr0UnG', description: 'Hour of the day' }) },
    { value: '10', displayName: intl.formatMessage({ defaultMessage: '10', id: 'OH9xlX', description: 'Hour of the day' }) },
    { value: '11', displayName: intl.formatMessage({ defaultMessage: '11', id: 'iq+tiv', description: 'Hour of the day' }) },
    { value: '12', displayName: intl.formatMessage({ defaultMessage: '12', id: '9SuA/E', description: 'Hour of the day' }) },
    { value: '13', displayName: intl.formatMessage({ defaultMessage: '13', id: 'mx2IMJ', description: 'Hour of the day' }) },
    { value: '14', displayName: intl.formatMessage({ defaultMessage: '14', id: '4wjJs0', description: 'Hour of the day' }) },
    { value: '15', displayName: intl.formatMessage({ defaultMessage: '15', id: 'n+F7e2', description: 'Hour of the day' }) },
    { value: '16', displayName: intl.formatMessage({ defaultMessage: '16', id: 'ui7GCl', description: 'Hour of the day' }) },
    { value: '17', displayName: intl.formatMessage({ defaultMessage: '17', id: '2Noh96', description: 'Hour of the day' }) },
    { value: '18', displayName: intl.formatMessage({ defaultMessage: '18', id: '14lYtE', description: 'Hour of the day' }) },
    { value: '19', displayName: intl.formatMessage({ defaultMessage: '19', id: 'nx25nq', description: 'Hour of the day' }) },
    { value: '20', displayName: intl.formatMessage({ defaultMessage: '20', id: 'FIT7i0', description: 'Hour of the day' }) },
    { value: '21', displayName: intl.formatMessage({ defaultMessage: '21', id: 'iRe/g7', description: 'Hour of the day' }) },
    { value: '22', displayName: intl.formatMessage({ defaultMessage: '22', id: 'IA+Ogm', description: 'Hour of the day' }) },
    { value: '23', displayName: intl.formatMessage({ defaultMessage: '23', id: 'VUH9aj', description: 'Hour of the day' }) },
  ];
};

export const getScheduleDayValues = (intl: IntlShape) => {
  return [
    { value: 'Monday', displayName: intl.formatMessage({ defaultMessage: 'Monday', id: 'kZCX7t', description: 'Day of the week' }) },
    { value: 'Tuesday', displayName: intl.formatMessage({ defaultMessage: 'Tuesday', id: 'NvJDn/', description: 'Day of the week' }) },
    { value: 'Wednesday', displayName: intl.formatMessage({ defaultMessage: 'Wednesday', id: 'x+6ccf', description: 'Day of the week' }) },
    { value: 'Thursday', displayName: intl.formatMessage({ defaultMessage: 'Thursday', id: '8Y5xpK', description: 'Day of the week' }) },
    { value: 'Friday', displayName: intl.formatMessage({ defaultMessage: 'Friday', id: 'TNEttQ', description: 'Day of the week' }) },
    { value: 'Saturday', displayName: intl.formatMessage({ defaultMessage: 'Saturday', id: '8JEHiY', description: 'Day of the week' }) },
    { value: 'Sunday', displayName: intl.formatMessage({ defaultMessage: 'Sunday', id: 'w5Hhig', description: 'Day of the week' }) },
  ];
};
