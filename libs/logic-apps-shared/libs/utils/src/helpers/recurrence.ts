import type { IntlShape } from 'react-intl';

export const getFrequencyValues = (intl: IntlShape) => {
  return [
    {
      displayName: intl.formatMessage({ defaultMessage: 'Month', description: 'Frequency value ' }),
      value: 'Month',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: 'Week', description: 'Frequency value ' }),
      value: 'Week',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: 'Day', description: 'Frequency value ' }),
      value: 'Day',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: 'Hour', description: 'Frequency value ' }),
      value: 'Hour',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: 'Minute', description: 'Frequency value ' }),
      value: 'Minute',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: 'Second', description: 'Frequency value ' }),
      value: 'Second',
    },
  ];
};

export const getTimezoneValues = (intl: IntlShape) => {
  return [
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-12:00) International Date Line West', description: 'Time zone value ' }),
      value: 'Dateline Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-11:00) Coordinated Universal Time-11', description: 'Time zone value ' }),
      value: 'UTC-11',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-10:00) Aleutian Islands', description: 'Time zone value ' }),
      value: 'Aleutian Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-10:00) Hawaii', description: 'Time zone value ' }),
      value: 'Hawaiian Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-09:30) Marquesas Islands', description: 'Time zone value ' }),
      value: 'Marquesas Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-09:00) Alaska', description: 'Time zone value ' }),
      value: 'Alaskan Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-09:00) Coordinated Universal Time-09', description: 'Time zone value ' }),
      value: 'UTC-09',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-08:00) Baja California', description: 'Time zone value ' }),
      value: 'Pacific Standard Time (Mexico)',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-08:00) Coordinated Universal Time-08', description: 'Time zone value ' }),
      value: 'UTC-08',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-08:00) Pacific Time (US & Canada)', description: 'Time zone value ' }),
      value: 'Pacific Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-07:00) Arizona', description: 'Time zone value ' }),
      value: 'US Mountain Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-07:00) Chihuahua, La Paz, Mazatlan', description: 'Time zone value ' }),
      value: 'Mountain Standard Time (Mexico)',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-07:00) Mountain Time (US & Canada)', description: 'Time zone value ' }),
      value: 'Mountain Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-06:00) Central America', description: 'Time zone value ' }),
      value: 'Central America Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-06:00) Central Time (US & Canada)', description: 'Time zone value ' }),
      value: 'Central Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-06:00) Easter Island', description: 'Time zone value ' }),
      value: 'Easter Island Standard Time',
    },
    {
      displayName: intl.formatMessage({
        defaultMessage: '(UTC-06:00) Guadalajara, Mexico City, Monterrey',
        description: 'Time zone value ',
      }),
      value: 'Central Standard Time (Mexico)',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-06:00) Saskatchewan', description: 'Time zone value ' }),
      value: 'Canada Central Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-05:00) Bogota, Lima, Quito, Rio Branco', description: 'Time zone value ' }),
      value: 'SA Pacific Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-05:00) Chetumal', description: 'Time zone value ' }),
      value: 'Eastern Standard Time (Mexico)',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-05:00) Eastern Time (US & Canada)', description: 'Time zone value ' }),
      value: 'Eastern Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-05:00) Haiti', description: 'Time zone value ' }),
      value: 'Haiti Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-05:00) Havana', description: 'Time zone value ' }),
      value: 'Cuba Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-05:00) Indiana (East)', description: 'Time zone value ' }),
      value: 'US Eastern Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-04:00) Asuncion', description: 'Time zone value ' }),
      value: 'Paraguay Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-04:00) Atlantic Time (Canada)', description: 'Time zone value ' }),
      value: 'Atlantic Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-04:00) Caracas', description: 'Time zone value ' }),
      value: 'Venezuela Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-04:00) Cuiaba', description: 'Time zone value ' }),
      value: 'Central Brazilian Standard Time',
    },
    {
      displayName: intl.formatMessage({
        defaultMessage: '(UTC-04:00) Georgetown, La Paz, Manaus, San Juan',
        description: 'Time zone value ',
      }),
      value: 'SA Western Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-04:00) Santiago', description: 'Time zone value ' }),
      value: 'Pacific SA Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-04:00) Turks and Caicos', description: 'Time zone value ' }),
      value: 'Turks And Caicos Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-03:30) Newfoundland', description: 'Time zone value ' }),
      value: 'Newfoundland Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-03:00) Araguaina', description: 'Time zone value ' }),
      value: 'Tocantins Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-03:00) Brasilia', description: 'Time zone value ' }),
      value: 'E. South America Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-03:00) Cayenne, Fortaleza', description: 'Time zone value ' }),
      value: 'SA Eastern Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-03:00) City of Buenos Aires', description: 'Time zone value ' }),
      value: 'Argentina Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-03:00) Greenland', description: 'Time zone value ' }),
      value: 'Greenland Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-03:00) Montevideo', description: 'Time zone value ' }),
      value: 'Montevideo Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-03:00) Saint Pierre and Miquelon', description: 'Time zone value ' }),
      value: 'Saint Pierre Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-03:00) Salvador', description: 'Time zone value ' }),
      value: 'Bahia Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-02:00) Coordinated Universal Time-02', description: 'Time zone value ' }),
      value: 'UTC-02',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-02:00) Mid-Atlantic - Old', description: 'Time zone value ' }),
      value: 'Mid-Atlantic Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-01:00) Azores', description: 'Time zone value ' }),
      value: 'Azores Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-01:00) Cabo Verde Is.', description: 'Time zone value ' }),
      value: 'Cape Verde Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC) Coordinated Universal Time', description: 'Time zone value ' }),
      value: 'UTC',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+00:00) Casablanca', description: 'Time zone value ' }),
      value: 'Morocco Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+00:00) Dublin, Edinburgh, Lisbon, London', description: 'Time zone value ' }),
      value: 'GMT Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+00:00) Monrovia, Reykjavik', description: 'Time zone value ' }),
      value: 'Greenwich Standard Time',
    },
    {
      displayName: intl.formatMessage({
        defaultMessage: '(UTC+01:00) Amsterdam, Berlin, Bern, Rome, Stockholm, Vienna',
        description: 'Time zone value ',
      }),
      value: 'W. Europe Standard Time',
    },
    {
      displayName: intl.formatMessage({
        defaultMessage: '(UTC+01:00) Belgrade, Bratislava, Budapest, Ljubljana, Prague',
        description: 'Time zone value ',
      }),
      value: 'Central Europe Standard Time',
    },
    {
      displayName: intl.formatMessage({
        defaultMessage: '(UTC+01:00) Brussels, Copenhagen, Madrid, Paris',
        description: 'Time zone value ',
      }),
      value: 'Romance Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+01:00) Sarajevo, Skopje, Warsaw, Zagreb', description: 'Time zone value ' }),
      value: 'Central European Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+01:00) West Central Africa', description: 'Time zone value ' }),
      value: 'W. Central Africa Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+01:00) Windhoek', description: 'Time zone value ' }),
      value: 'Namibia Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+02:00) Amman', description: 'Time zone value ' }),
      value: 'Jordan Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+02:00) Athens, Bucharest', description: 'Time zone value ' }),
      value: 'GTB Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+02:00) Beirut', description: 'Time zone value ' }),
      value: 'Middle East Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+02:00) Cairo', description: 'Time zone value ' }),
      value: 'Egypt Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+02:00) Chisinau', description: 'Time zone value ' }),
      value: 'E. Europe Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+02:00) Damascus', description: 'Time zone value ' }),
      value: 'Syria Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+02:00) Gaza, Hebron', description: 'Time zone value ' }),
      value: 'West Bank Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+02:00) Harare, Pretoria', description: 'Time zone value ' }),
      value: 'South Africa Standard Time',
    },
    {
      displayName: intl.formatMessage({
        defaultMessage: '(UTC+02:00) Helsinki, Kyiv, Riga, Sofia, Tallinn, Vilnius',
        description: 'Time zone value ',
      }),
      value: 'FLE Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+02:00) Istanbul', description: 'Time zone value ' }),
      value: 'Turkey Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+02:00) Jerusalem', description: 'Time zone value ' }),
      value: 'Israel Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+02:00) Kaliningrad', description: 'Time zone value ' }),
      value: 'Kaliningrad Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+02:00) Tripoli', description: 'Time zone value ' }),
      value: 'Libya Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+03:00) Baghdad', description: 'Time zone value ' }),
      value: 'Arabic Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+03:00) Kuwait, Riyadh', description: 'Time zone value ' }),
      value: 'Arab Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+03:00) Minsk', description: 'Time zone value ' }),
      value: 'Belarus Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+03:00) Moscow, St. Petersburg, Volgograd', description: 'Time zone value ' }),
      value: 'Russian Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+03:00) Nairobi', description: 'Time zone value ' }),
      value: 'E. Africa Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+03:30) Tehran', description: 'Time zone value ' }),
      value: 'Iran Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+04:00) Abu Dhabi, Muscat', description: 'Time zone value ' }),
      value: 'Arabian Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+04:00) Astrakhan, Ulyanovsk', description: 'Time zone value ' }),
      value: 'Astrakhan Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+04:00) Baku', description: 'Time zone value ' }),
      value: 'Azerbaijan Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+04:00) Izhevsk, Samara', description: 'Time zone value ' }),
      value: 'Russia Time Zone 3',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+04:00) Port Louis', description: 'Time zone value ' }),
      value: 'Mauritius Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+04:00) Tbilisi', description: 'Time zone value ' }),
      value: 'Georgian Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+04:00) Yerevan', description: 'Time zone value ' }),
      value: 'Caucasus Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+04:30) Kabul', description: 'Time zone value ' }),
      value: 'Afghanistan Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+05:00) Ashgabat, Tashkent', description: 'Time zone value ' }),
      value: 'West Asia Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+05:00) Ekaterinburg', description: 'Time zone value ' }),
      value: 'Ekaterinburg Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+05:00) Islamabad, Karachi', description: 'Time zone value ' }),
      value: 'Pakistan Standard Time',
    },
    {
      displayName: intl.formatMessage({
        defaultMessage: '(UTC+05:30) Chennai, Kolkata, Mumbai, New Delhi',
        description: 'Time zone value ',
      }),
      value: 'India Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+05:30) Sri Jayawardenepura', description: 'Time zone value ' }),
      value: 'Sri Lanka Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+05:45) Kathmandu', description: 'Time zone value ' }),
      value: 'Nepal Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+06:00) Astana', description: 'Time zone value ' }),
      value: 'Central Asia Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+06:00) Dhaka', description: 'Time zone value ' }),
      value: 'Bangladesh Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+06:00) Novosibirsk', description: 'Time zone value ' }),
      value: 'N. Central Asia Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+06:30) Yangon (Rangoon)', description: 'Time zone value ' }),
      value: 'Myanmar Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+07:00) Bangkok, Hanoi, Jakarta', description: 'Time zone value ' }),
      value: 'SE Asia Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+07:00) Barnaul, Gorno-Altaysk', description: 'Time zone value ' }),
      value: 'Altai Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+07:00) Hovd', description: 'Time zone value ' }),
      value: 'W. Mongolia Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+07:00) Krasnoyarsk', description: 'Time zone value ' }),
      value: 'North Asia Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+07:00) Tomsk', description: 'Time zone value ' }),
      value: 'Tomsk Standard Time',
    },
    {
      displayName: intl.formatMessage({
        defaultMessage: '(UTC+08:00) Beijing, Chongqing, Hong Kong, Urumqi',
        description: 'Time zone value ',
      }),
      value: 'China Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+08:00) Irkutsk', description: 'Time zone value ' }),
      value: 'North Asia East Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+08:00) Kuala Lumpur, Singapore', description: 'Time zone value ' }),
      value: 'Singapore Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+08:00) Perth', description: 'Time zone value ' }),
      value: 'W. Australia Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+08:00) Taipei', description: 'Time zone value ' }),
      value: 'Taipei Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+08:00) Ulaanbaatar', description: 'Time zone value ' }),
      value: 'Ulaanbaatar Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+08:30) Pyongyang', description: 'Time zone value ' }),
      value: 'North Korea Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+08:45) Eucla', description: 'Time zone value ' }),
      value: 'Aus Central W. Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+09:00) Chita', description: 'Time zone value ' }),
      value: 'Transbaikal Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+09:00) Osaka, Sapporo, Tokyo', description: 'Time zone value ' }),
      value: 'Tokyo Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+09:00) Seoul', description: 'Time zone value ' }),
      value: 'Korea Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+09:00) Yakutsk', description: 'Time zone value ' }),
      value: 'Yakutsk Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+09:30) Adelaide', description: 'Time zone value ' }),
      value: 'Cen. Australia Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+09:30) Darwin', description: 'Time zone value ' }),
      value: 'AUS Central Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+10:00) Brisbane', description: 'Time zone value ' }),
      value: 'E. Australia Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+10:00) Canberra, Melbourne, Sydney', description: 'Time zone value ' }),
      value: 'AUS Eastern Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+10:00) Guam, Port Moresby', description: 'Time zone value ' }),
      value: 'West Pacific Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+10:00) Hobart', description: 'Time zone value ' }),
      value: 'Tasmania Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+10:00) Vladivostok', description: 'Time zone value ' }),
      value: 'Vladivostok Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+10:30) Lord Howe Island', description: 'Time zone value ' }),
      value: 'Lord Howe Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+11:00) Bougainville Island', description: 'Time zone value ' }),
      value: 'Bougainville Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+11:00) Chokurdakh', description: 'Time zone value ' }),
      value: 'Russia Time Zone 10',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+11:00) Magadan', description: 'Time zone value ' }),
      value: 'Magadan Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+11:00) Norfolk Island', description: 'Time zone value ' }),
      value: 'Norfolk Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+11:00) Sakhalin', description: 'Time zone value ' }),
      value: 'Sakhalin Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+11:00) Solomon Is., New Caledonia', description: 'Time zone value ' }),
      value: 'Central Pacific Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+12:00) Anadyr, Petropavlovsk-Kamchatsky', description: 'Time zone value ' }),
      value: 'Russia Time Zone 11',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+12:00) Auckland, Wellington', description: 'Time zone value ' }),
      value: 'New Zealand Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+12:00) Coordinated Universal Time+12', description: 'Time zone value ' }),
      value: 'UTC+12',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+12:00) Fiji', description: 'Time zone value ' }),
      value: 'Fiji Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+12:00) Petropavlovsk-Kamchatsky - Old', description: 'Time zone value ' }),
      value: 'Kamchatka Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+12:45) Chatham Islands', description: 'Time zone value ' }),
      value: 'Chatham Islands Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: "(UTC+13:00) Nuku'alofa", description: 'Time zone value ' }),
      value: 'Tonga Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+13:00) Samoa', description: 'Time zone value ' }),
      value: 'Samoa Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+14:00) Kiritimati Island', description: 'Time zone value ' }),
      value: 'Line Islands Standard Time',
    },
  ];
};

export const getScheduleHourValues = (intl: IntlShape) => {
  return [
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
  ];
};

export const getScheduleDayValues = (intl: IntlShape) => {
  return [
    { value: 'Monday', displayName: intl.formatMessage({ defaultMessage: 'Monday', description: 'Day of the week' }) },
    { value: 'Tuesday', displayName: intl.formatMessage({ defaultMessage: 'Tuesday', description: 'Day of the week' }) },
    { value: 'Wednesday', displayName: intl.formatMessage({ defaultMessage: 'Wednesday', description: 'Day of the week' }) },
    { value: 'Thursday', displayName: intl.formatMessage({ defaultMessage: 'Thursday', description: 'Day of the week' }) },
    { value: 'Friday', displayName: intl.formatMessage({ defaultMessage: 'Friday', description: 'Day of the week' }) },
    { value: 'Saturday', displayName: intl.formatMessage({ defaultMessage: 'Saturday', description: 'Day of the week' }) },
    { value: 'Sunday', displayName: intl.formatMessage({ defaultMessage: 'Sunday', description: 'Day of the week' }) },
  ];
};
