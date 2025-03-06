import type { IntlShape } from 'react-intl';

export const getFrequencyValues = (intl: IntlShape) => {
  return [
    {
      displayName: intl.formatMessage({ defaultMessage: 'Month', id: 'ms1c7f7bd22261', description: 'Frequency value ' }),
      value: 'Month',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: 'Week', id: 'ms5797f785a7ac', description: 'Frequency value ' }),
      value: 'Week',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: 'Day', id: 'mse5d0808f2091', description: 'Frequency value ' }),
      value: 'Day',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: 'Hour', id: 'msd2ea6e0af3ed', description: 'Frequency value ' }),
      value: 'Hour',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: 'Minute', id: 'ms5ffee37be63f', description: 'Frequency value ' }),
      value: 'Minute',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: 'Second', id: 'ms695fe72d2a7f', description: 'Frequency value ' }),
      value: 'Second',
    },
  ];
};

export const getTimezoneValues = (intl: IntlShape) => {
  return [
    {
      displayName: intl.formatMessage({
        defaultMessage: '(UTC-12:00) International Date Line West',
        id: 'ms212e2f3572ee',
        description: 'Time zone value ',
      }),
      value: 'Dateline Standard Time',
    },
    {
      displayName: intl.formatMessage({
        defaultMessage: '(UTC-11:00) Coordinated Universal Time-11',
        id: 'ms238d6f67f29f',
        description: 'Time zone value ',
      }),
      value: 'UTC-11',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-10:00) Aleutian Islands', id: 'ms8d0ed4cd5576', description: 'Time zone value ' }),
      value: 'Aleutian Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-10:00) Hawaii', id: 'ms43e6591c8951', description: 'Time zone value ' }),
      value: 'Hawaiian Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-09:30) Marquesas Islands', id: 'msc2d8f4ec92cd', description: 'Time zone value ' }),
      value: 'Marquesas Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-09:00) Alaska', id: 'ms273473569d1b', description: 'Time zone value ' }),
      value: 'Alaskan Standard Time',
    },
    {
      displayName: intl.formatMessage({
        defaultMessage: '(UTC-09:00) Coordinated Universal Time-09',
        id: 'msbbcd7307d677',
        description: 'Time zone value ',
      }),
      value: 'UTC-09',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-08:00) Baja California', id: 'msa0ed76afad23', description: 'Time zone value ' }),
      value: 'Pacific Standard Time (Mexico)',
    },
    {
      displayName: intl.formatMessage({
        defaultMessage: '(UTC-08:00) Coordinated Universal Time-08',
        id: 'ms2009afa5a603',
        description: 'Time zone value ',
      }),
      value: 'UTC-08',
    },
    {
      displayName: intl.formatMessage({
        defaultMessage: '(UTC-08:00) Pacific Time (US & Canada)',
        id: 'msb5922508039a',
        description: 'Time zone value ',
      }),
      value: 'Pacific Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-07:00) Arizona', id: 'ms0c4bbba0aea5', description: 'Time zone value ' }),
      value: 'US Mountain Standard Time',
    },
    {
      displayName: intl.formatMessage({
        defaultMessage: '(UTC-07:00) Chihuahua, La Paz, Mazatlan',
        id: 'ms14bff46693e4',
        description: 'Time zone value ',
      }),
      value: 'Mountain Standard Time (Mexico)',
    },
    {
      displayName: intl.formatMessage({
        defaultMessage: '(UTC-07:00) Mountain Time (US & Canada)',
        id: 'ms513da8ce3cfe',
        description: 'Time zone value ',
      }),
      value: 'Mountain Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-06:00) Central America', id: 'ms7859cb58a39e', description: 'Time zone value ' }),
      value: 'Central America Standard Time',
    },
    {
      displayName: intl.formatMessage({
        defaultMessage: '(UTC-06:00) Central Time (US & Canada)',
        id: 'msf373d8b80ff1',
        description: 'Time zone value ',
      }),
      value: 'Central Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-06:00) Easter Island', id: 'ms4e33240cf9b3', description: 'Time zone value ' }),
      value: 'Easter Island Standard Time',
    },
    {
      displayName: intl.formatMessage({
        defaultMessage: '(UTC-06:00) Guadalajara, Mexico City, Monterrey',
        id: 'ms8229c6219e5a',
        description: 'Time zone value ',
      }),
      value: 'Central Standard Time (Mexico)',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-06:00) Saskatchewan', id: 'msfd14bd17b554', description: 'Time zone value ' }),
      value: 'Canada Central Standard Time',
    },
    {
      displayName: intl.formatMessage({
        defaultMessage: '(UTC-05:00) Bogota, Lima, Quito, Rio Branco',
        id: 'ms9122bd3ea00e',
        description: 'Time zone value ',
      }),
      value: 'SA Pacific Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-05:00) Chetumal', id: 'msb056e70ac925', description: 'Time zone value ' }),
      value: 'Eastern Standard Time (Mexico)',
    },
    {
      displayName: intl.formatMessage({
        defaultMessage: '(UTC-05:00) Eastern Time (US & Canada)',
        id: 'msecfb56beeb0f',
        description: 'Time zone value ',
      }),
      value: 'Eastern Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-05:00) Haiti', id: 'ms7d51b9683f0e', description: 'Time zone value ' }),
      value: 'Haiti Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-05:00) Havana', id: 'ms09be8812a366', description: 'Time zone value ' }),
      value: 'Cuba Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-05:00) Indiana (East)', id: 'ms5efe4218d449', description: 'Time zone value ' }),
      value: 'US Eastern Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-04:00) Asuncion', id: 'msfe49b978ec28', description: 'Time zone value ' }),
      value: 'Paraguay Standard Time',
    },
    {
      displayName: intl.formatMessage({
        defaultMessage: '(UTC-04:00) Atlantic Time (Canada)',
        id: 'ms619e4ac1e932',
        description: 'Time zone value ',
      }),
      value: 'Atlantic Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-04:00) Caracas', id: 'msce478a584f81', description: 'Time zone value ' }),
      value: 'Venezuela Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-04:00) Cuiaba', id: 'ms732101bac0cd', description: 'Time zone value ' }),
      value: 'Central Brazilian Standard Time',
    },
    {
      displayName: intl.formatMessage({
        defaultMessage: '(UTC-04:00) Georgetown, La Paz, Manaus, San Juan',
        id: 'ms346274d1ed30',
        description: 'Time zone value ',
      }),
      value: 'SA Western Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-04:00) Santiago', id: 'ms9f8dae00ee8e', description: 'Time zone value ' }),
      value: 'Pacific SA Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-04:00) Turks and Caicos', id: 'msec4676a187e8', description: 'Time zone value ' }),
      value: 'Turks And Caicos Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-03:30) Newfoundland', id: 'ms7e27d23db22c', description: 'Time zone value ' }),
      value: 'Newfoundland Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-03:00) Araguaina', id: 'ms34ca45b3a040', description: 'Time zone value ' }),
      value: 'Tocantins Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-03:00) Brasilia', id: 'msf4b2e7c89a03', description: 'Time zone value ' }),
      value: 'E. South America Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-03:00) Cayenne, Fortaleza', id: 'ms2dd2139c62d5', description: 'Time zone value ' }),
      value: 'SA Eastern Standard Time',
    },
    {
      displayName: intl.formatMessage({
        defaultMessage: '(UTC-03:00) City of Buenos Aires',
        id: 'ms184d785dd8f3',
        description: 'Time zone value ',
      }),
      value: 'Argentina Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-03:00) Greenland', id: 'msba1ffe64d3d9', description: 'Time zone value ' }),
      value: 'Greenland Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-03:00) Montevideo', id: 'ms5f689d2eccd7', description: 'Time zone value ' }),
      value: 'Montevideo Standard Time',
    },
    {
      displayName: intl.formatMessage({
        defaultMessage: '(UTC-03:00) Saint Pierre and Miquelon',
        id: 'msc5249f282afb',
        description: 'Time zone value ',
      }),
      value: 'Saint Pierre Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-03:00) Salvador', id: 'msdcc4d261917e', description: 'Time zone value ' }),
      value: 'Bahia Standard Time',
    },
    {
      displayName: intl.formatMessage({
        defaultMessage: '(UTC-02:00) Coordinated Universal Time-02',
        id: 'ms1d8843601165',
        description: 'Time zone value ',
      }),
      value: 'UTC-02',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-02:00) Mid-Atlantic - Old', id: 'ms09bf29bf42df', description: 'Time zone value ' }),
      value: 'Mid-Atlantic Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-01:00) Azores', id: 'msd611c5771b78', description: 'Time zone value ' }),
      value: 'Azores Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC-01:00) Cabo Verde Is.', id: 'msc95148010d35', description: 'Time zone value ' }),
      value: 'Cape Verde Standard Time',
    },
    {
      displayName: intl.formatMessage({
        defaultMessage: '(UTC) Coordinated Universal Time',
        id: 'msb84d00d2c4f6',
        description: 'Time zone value ',
      }),
      value: 'UTC',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+00:00) Casablanca', id: 'ms8736bf7130cc', description: 'Time zone value ' }),
      value: 'Morocco Standard Time',
    },
    {
      displayName: intl.formatMessage({
        defaultMessage: '(UTC+00:00) Dublin, Edinburgh, Lisbon, London',
        id: 'msda1ad038b7c1',
        description: 'Time zone value ',
      }),
      value: 'GMT Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+00:00) Monrovia, Reykjavik', id: 'ms469e691d42c3', description: 'Time zone value ' }),
      value: 'Greenwich Standard Time',
    },
    {
      displayName: intl.formatMessage({
        defaultMessage: '(UTC+01:00) Amsterdam, Berlin, Bern, Rome, Stockholm, Vienna',
        id: 'msc7775638bb40',
        description: 'Time zone value ',
      }),
      value: 'W. Europe Standard Time',
    },
    {
      displayName: intl.formatMessage({
        defaultMessage: '(UTC+01:00) Belgrade, Bratislava, Budapest, Ljubljana, Prague',
        id: 'ms2d5de4e3cde2',
        description: 'Time zone value ',
      }),
      value: 'Central Europe Standard Time',
    },
    {
      displayName: intl.formatMessage({
        defaultMessage: '(UTC+01:00) Brussels, Copenhagen, Madrid, Paris',
        id: 'ms6223b26e93cf',
        description: 'Time zone value ',
      }),
      value: 'Romance Standard Time',
    },
    {
      displayName: intl.formatMessage({
        defaultMessage: '(UTC+01:00) Sarajevo, Skopje, Warsaw, Zagreb',
        id: 'mscae72f2443fa',
        description: 'Time zone value ',
      }),
      value: 'Central European Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+01:00) West Central Africa', id: 'ms11a4c670ded8', description: 'Time zone value ' }),
      value: 'W. Central Africa Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+01:00) Windhoek', id: 'ms97ff581d0ffc', description: 'Time zone value ' }),
      value: 'Namibia Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+02:00) Amman', id: 'ms3e305c1b7dff', description: 'Time zone value ' }),
      value: 'Jordan Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+02:00) Athens, Bucharest', id: 'msccebc617c76c', description: 'Time zone value ' }),
      value: 'GTB Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+02:00) Beirut', id: 'ms2a50d6fb9f99', description: 'Time zone value ' }),
      value: 'Middle East Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+02:00) Cairo', id: 'ms3eafb86beb75', description: 'Time zone value ' }),
      value: 'Egypt Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+02:00) Chisinau', id: 'ms0d85e810c041', description: 'Time zone value ' }),
      value: 'E. Europe Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+02:00) Damascus', id: 'ms2f1f0746565b', description: 'Time zone value ' }),
      value: 'Syria Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+02:00) Gaza, Hebron', id: 'ms859a9076d92b', description: 'Time zone value ' }),
      value: 'West Bank Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+02:00) Harare, Pretoria', id: 'ms8b511062602b', description: 'Time zone value ' }),
      value: 'South Africa Standard Time',
    },
    {
      displayName: intl.formatMessage({
        defaultMessage: '(UTC+02:00) Helsinki, Kyiv, Riga, Sofia, Tallinn, Vilnius',
        id: 'ms37b13d85dd10',
        description: 'Time zone value ',
      }),
      value: 'FLE Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+02:00) Istanbul', id: 'msc4941e78222e', description: 'Time zone value ' }),
      value: 'Turkey Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+02:00) Jerusalem', id: 'ms20fc1682e6b4', description: 'Time zone value ' }),
      value: 'Israel Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+02:00) Kaliningrad', id: 'ms4e55fdf04d2c', description: 'Time zone value ' }),
      value: 'Kaliningrad Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+02:00) Tripoli', id: 'ms1714364ec7a5', description: 'Time zone value ' }),
      value: 'Libya Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+03:00) Baghdad', id: 'ms5d0e0e0956f9', description: 'Time zone value ' }),
      value: 'Arabic Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+03:00) Kuwait, Riyadh', id: 'msa796480f4ee2', description: 'Time zone value ' }),
      value: 'Arab Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+03:00) Minsk', id: 'msd4a1694d7394', description: 'Time zone value ' }),
      value: 'Belarus Standard Time',
    },
    {
      displayName: intl.formatMessage({
        defaultMessage: '(UTC+03:00) Moscow, St. Petersburg, Volgograd',
        id: 'ms2315a2a7ba69',
        description: 'Time zone value ',
      }),
      value: 'Russian Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+03:00) Nairobi', id: 'ms5ce01c8d0349', description: 'Time zone value ' }),
      value: 'E. Africa Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+03:30) Tehran', id: 'msa3b6ddd68ae8', description: 'Time zone value ' }),
      value: 'Iran Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+04:00) Abu Dhabi, Muscat', id: 'ms915c095eda3b', description: 'Time zone value ' }),
      value: 'Arabian Standard Time',
    },
    {
      displayName: intl.formatMessage({
        defaultMessage: '(UTC+04:00) Astrakhan, Ulyanovsk',
        id: 'ms591d4adf3cee',
        description: 'Time zone value ',
      }),
      value: 'Astrakhan Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+04:00) Baku', id: 'ms30f3f223aa04', description: 'Time zone value ' }),
      value: 'Azerbaijan Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+04:00) Izhevsk, Samara', id: 'ms068831265b45', description: 'Time zone value ' }),
      value: 'Russia Time Zone 3',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+04:00) Port Louis', id: 'msaf13179996e9', description: 'Time zone value ' }),
      value: 'Mauritius Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+04:00) Tbilisi', id: 'msd3acca6609ce', description: 'Time zone value ' }),
      value: 'Georgian Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+04:00) Yerevan', id: 'ms4497acd707cc', description: 'Time zone value ' }),
      value: 'Caucasus Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+04:30) Kabul', id: 'msc31690c03025', description: 'Time zone value ' }),
      value: 'Afghanistan Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+05:00) Ashgabat, Tashkent', id: 'ms816c988343d3', description: 'Time zone value ' }),
      value: 'West Asia Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+05:00) Ekaterinburg', id: 'ms534235d3030d', description: 'Time zone value ' }),
      value: 'Ekaterinburg Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+05:00) Islamabad, Karachi', id: 'msfcdb5e6cf347', description: 'Time zone value ' }),
      value: 'Pakistan Standard Time',
    },
    {
      displayName: intl.formatMessage({
        defaultMessage: '(UTC+05:30) Chennai, Kolkata, Mumbai, New Delhi',
        id: 'ms62053cf003d9',
        description: 'Time zone value ',
      }),
      value: 'India Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+05:30) Sri Jayawardenepura', id: 'msd01e710ee1e3', description: 'Time zone value ' }),
      value: 'Sri Lanka Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+05:45) Kathmandu', id: 'ms9e31acb6a1c8', description: 'Time zone value ' }),
      value: 'Nepal Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+06:00) Astana', id: 'msf197dbc99100', description: 'Time zone value ' }),
      value: 'Central Asia Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+06:00) Dhaka', id: 'ms3ff7677ca68b', description: 'Time zone value ' }),
      value: 'Bangladesh Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+06:00) Novosibirsk', id: 'ms54f87d26882a', description: 'Time zone value ' }),
      value: 'N. Central Asia Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+06:30) Yangon (Rangoon)', id: 'msbb0b86534ada', description: 'Time zone value ' }),
      value: 'Myanmar Standard Time',
    },
    {
      displayName: intl.formatMessage({
        defaultMessage: '(UTC+07:00) Bangkok, Hanoi, Jakarta',
        id: 'msb8d1e91816a7',
        description: 'Time zone value ',
      }),
      value: 'SE Asia Standard Time',
    },
    {
      displayName: intl.formatMessage({
        defaultMessage: '(UTC+07:00) Barnaul, Gorno-Altaysk',
        id: 'ms9822ac17047a',
        description: 'Time zone value ',
      }),
      value: 'Altai Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+07:00) Hovd', id: 'ms3ee76596005d', description: 'Time zone value ' }),
      value: 'W. Mongolia Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+07:00) Krasnoyarsk', id: 'ms5d378b230579', description: 'Time zone value ' }),
      value: 'North Asia Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+07:00) Tomsk', id: 'ms7b8259118abf', description: 'Time zone value ' }),
      value: 'Tomsk Standard Time',
    },
    {
      displayName: intl.formatMessage({
        defaultMessage: '(UTC+08:00) Beijing, Chongqing, Hong Kong, Urumqi',
        id: 'ms7e9f11cb7c27',
        description: 'Time zone value ',
      }),
      value: 'China Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+08:00) Irkutsk', id: 'msf1e29ffdc532', description: 'Time zone value ' }),
      value: 'North Asia East Standard Time',
    },
    {
      displayName: intl.formatMessage({
        defaultMessage: '(UTC+08:00) Kuala Lumpur, Singapore',
        id: 'msfa600947746b',
        description: 'Time zone value ',
      }),
      value: 'Singapore Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+08:00) Perth', id: 'msd5e290c28e7d', description: 'Time zone value ' }),
      value: 'W. Australia Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+08:00) Taipei', id: 'ms3a027d786f96', description: 'Time zone value ' }),
      value: 'Taipei Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+08:00) Ulaanbaatar', id: 'ms065e08bf4807', description: 'Time zone value ' }),
      value: 'Ulaanbaatar Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+08:30) Pyongyang', id: 'ms99e8f4d8201c', description: 'Time zone value ' }),
      value: 'North Korea Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+08:45) Eucla', id: 'mse7e3f779f5c4', description: 'Time zone value ' }),
      value: 'Aus Central W. Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+09:00) Chita', id: 'msb191d3415ff4', description: 'Time zone value ' }),
      value: 'Transbaikal Standard Time',
    },
    {
      displayName: intl.formatMessage({
        defaultMessage: '(UTC+09:00) Osaka, Sapporo, Tokyo',
        id: 'mse7de416b02ff',
        description: 'Time zone value ',
      }),
      value: 'Tokyo Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+09:00) Seoul', id: 'ms7078810279d3', description: 'Time zone value ' }),
      value: 'Korea Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+09:00) Yakutsk', id: 'ms21ffa9e828a6', description: 'Time zone value ' }),
      value: 'Yakutsk Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+09:30) Adelaide', id: 'ms0b2d29c81497', description: 'Time zone value ' }),
      value: 'Cen. Australia Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+09:30) Darwin', id: 'msaf12097c3707', description: 'Time zone value ' }),
      value: 'AUS Central Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+10:00) Brisbane', id: 'ms9e8fd2320c58', description: 'Time zone value ' }),
      value: 'E. Australia Standard Time',
    },
    {
      displayName: intl.formatMessage({
        defaultMessage: '(UTC+10:00) Canberra, Melbourne, Sydney',
        id: 'mse37c4e6cf2bd',
        description: 'Time zone value ',
      }),
      value: 'AUS Eastern Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+10:00) Guam, Port Moresby', id: 'ms30eb2ec36a82', description: 'Time zone value ' }),
      value: 'West Pacific Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+10:00) Hobart', id: 'ms73714ba31d99', description: 'Time zone value ' }),
      value: 'Tasmania Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+10:00) Vladivostok', id: 'ms367ac72b7211', description: 'Time zone value ' }),
      value: 'Vladivostok Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+10:30) Lord Howe Island', id: 'msde7e699eff14', description: 'Time zone value ' }),
      value: 'Lord Howe Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+11:00) Bougainville Island', id: 'ms01ff957b45c7', description: 'Time zone value ' }),
      value: 'Bougainville Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+11:00) Chokurdakh', id: 'msb545386a4a10', description: 'Time zone value ' }),
      value: 'Russia Time Zone 10',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+11:00) Magadan', id: 'msbac099ed1e39', description: 'Time zone value ' }),
      value: 'Magadan Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+11:00) Norfolk Island', id: 'ms3a16ef5f38d5', description: 'Time zone value ' }),
      value: 'Norfolk Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+11:00) Sakhalin', id: 'ms13c8aa2e5c85', description: 'Time zone value ' }),
      value: 'Sakhalin Standard Time',
    },
    {
      displayName: intl.formatMessage({
        defaultMessage: '(UTC+11:00) Solomon Is., New Caledonia',
        id: 'ms46fa4776e47d',
        description: 'Time zone value ',
      }),
      value: 'Central Pacific Standard Time',
    },
    {
      displayName: intl.formatMessage({
        defaultMessage: '(UTC+12:00) Anadyr, Petropavlovsk-Kamchatsky',
        id: 'msd3ba19a17e36',
        description: 'Time zone value ',
      }),
      value: 'Russia Time Zone 11',
    },
    {
      displayName: intl.formatMessage({
        defaultMessage: '(UTC+12:00) Auckland, Wellington',
        id: 'ms0a2e3539d986',
        description: 'Time zone value ',
      }),
      value: 'New Zealand Standard Time',
    },
    {
      displayName: intl.formatMessage({
        defaultMessage: '(UTC+12:00) Coordinated Universal Time+12',
        id: 'ms47f6a2472112',
        description: 'Time zone value ',
      }),
      value: 'UTC+12',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+12:00) Fiji', id: 'ms2c244743db61', description: 'Time zone value ' }),
      value: 'Fiji Standard Time',
    },
    {
      displayName: intl.formatMessage({
        defaultMessage: '(UTC+12:00) Petropavlovsk-Kamchatsky - Old',
        id: 'mscd58841ab95d',
        description: 'Time zone value ',
      }),
      value: 'Kamchatka Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+12:45) Chatham Islands', id: 'msb6aa941d745c', description: 'Time zone value ' }),
      value: 'Chatham Islands Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: `(UTC+13:00) Nuku'alofa`, id: 'ms94cf6aac6b05', description: 'Time zone value ' }),
      value: 'Tonga Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+13:00) Samoa', id: 'ms09a6a37034cd', description: 'Time zone value ' }),
      value: 'Samoa Standard Time',
    },
    {
      displayName: intl.formatMessage({ defaultMessage: '(UTC+14:00) Kiritimati Island', id: 'ms9d50c6d349a1', description: 'Time zone value ' }),
      value: 'Line Islands Standard Time',
    },
  ];
};

export const getScheduleHourValues = (intl: IntlShape) => {
  return [
    { value: '0', displayName: intl.formatMessage({ defaultMessage: '0', id: 'msfeabb7cedb06', description: 'Hour of the day' }) },
    { value: '1', displayName: intl.formatMessage({ defaultMessage: '1', id: 'ms11dce822c6a3', description: 'Hour of the day' }) },
    { value: '2', displayName: intl.formatMessage({ defaultMessage: '2', id: 'ms162c908d4cdf', description: 'Hour of the day' }) },
    { value: '3', displayName: intl.formatMessage({ defaultMessage: '3', id: 'msdefa9f795e63', description: 'Hour of the day' }) },
    { value: '4', displayName: intl.formatMessage({ defaultMessage: '4', id: 'msbab007bf5b3e', description: 'Hour of the day' }) },
    { value: '5', displayName: intl.formatMessage({ defaultMessage: '5', id: 'msd6e1812cfa2e', description: 'Hour of the day' }) },
    { value: '6', displayName: intl.formatMessage({ defaultMessage: '6', id: 'ms464812732fa7', description: 'Hour of the day' }) },
    { value: '7', displayName: intl.formatMessage({ defaultMessage: '7', id: 'ms9f6d13da1238', description: 'Hour of the day' }) },
    { value: '8', displayName: intl.formatMessage({ defaultMessage: '8', id: 'msc9587d92b7b4', description: 'Hour of the day' }) },
    { value: '9', displayName: intl.formatMessage({ defaultMessage: '9', id: 'ms72bd149c69b7', description: 'Hour of the day' }) },
    { value: '10', displayName: intl.formatMessage({ defaultMessage: '10', id: 'ms387f71957e10', description: 'Hour of the day' }) },
    { value: '11', displayName: intl.formatMessage({ defaultMessage: '11', id: 'ms8aafad8afb22', description: 'Hour of the day' }) },
    { value: '12', displayName: intl.formatMessage({ defaultMessage: '12', id: 'msf52b80fc4434', description: 'Hour of the day' }) },
    { value: '13', displayName: intl.formatMessage({ defaultMessage: '13', id: 'ms9b1d883098d6', description: 'Hour of the day' }) },
    { value: '14', displayName: intl.formatMessage({ defaultMessage: '14', id: 'mse308c9b34a6d', description: 'Hour of the day' }) },
    { value: '15', displayName: intl.formatMessage({ defaultMessage: '15', id: 'ms9fe17b7b61ec', description: 'Hour of the day' }) },
    { value: '16', displayName: intl.formatMessage({ defaultMessage: '16', id: 'msba2ec60a5a15', description: 'Hour of the day' }) },
    { value: '17', displayName: intl.formatMessage({ defaultMessage: '17', id: 'msd8da21f7a1d4', description: 'Hour of the day' }) },
    { value: '18', displayName: intl.formatMessage({ defaultMessage: '18', id: 'msd78958b4459f', description: 'Hour of the day' }) },
    { value: '19', displayName: intl.formatMessage({ defaultMessage: '19', id: 'ms9f1db99eaea6', description: 'Hour of the day' }) },
    { value: '20', displayName: intl.formatMessage({ defaultMessage: '20', id: 'ms1484fb8b481d', description: 'Hour of the day' }) },
    { value: '21', displayName: intl.formatMessage({ defaultMessage: '21', id: 'ms8917bf83b4e4', description: 'Hour of the day' }) },
    { value: '22', displayName: intl.formatMessage({ defaultMessage: '22', id: 'ms200f8e826b62', description: 'Hour of the day' }) },
    { value: '23', displayName: intl.formatMessage({ defaultMessage: '23', id: 'ms5541fd6a3f79', description: 'Hour of the day' }) },
  ];
};

export const getScheduleDayValues = (intl: IntlShape) => {
  return [
    { value: 'Monday', displayName: intl.formatMessage({ defaultMessage: 'Monday', id: 'ms919097eed428', description: 'Day of the week' }) },
    { value: 'Tuesday', displayName: intl.formatMessage({ defaultMessage: 'Tuesday', id: 'ms36f2439ff90d', description: 'Day of the week' }) },
    { value: 'Wednesday', displayName: intl.formatMessage({ defaultMessage: 'Wednesday', id: 'msc7ee9c71fad7', description: 'Day of the week' }) },
    { value: 'Thursday', displayName: intl.formatMessage({ defaultMessage: 'Thursday', id: 'msf18e71a4ae14', description: 'Day of the week' }) },
    { value: 'Friday', displayName: intl.formatMessage({ defaultMessage: 'Friday', id: 'ms4cd12db50a32', description: 'Day of the week' }) },
    { value: 'Saturday', displayName: intl.formatMessage({ defaultMessage: 'Saturday', id: 'msf0910789811a', description: 'Day of the week' }) },
    { value: 'Sunday', displayName: intl.formatMessage({ defaultMessage: 'Sunday', id: 'msc391e18a0fa6', description: 'Day of the week' }) },
  ];
};
