import type { TagPickerOption } from './settingtagpicker';

/**
 * HTTP status code options for retry policy configuration.
 * Includes 4xx client errors and 5xx server errors.
 */
export const HTTP_STATUS_CODE_OPTIONS: TagPickerOption[] = [
  // 4xx Client Errors
  { label: '400 - Bad Request', value: '400' },
  { label: '401 - Unauthorized', value: '401' },
  { label: '402 - Payment Required', value: '402' },
  { label: '403 - Forbidden', value: '403' },
  { label: '404 - Not Found', value: '404' },
  { label: '405 - Method Not Allowed', value: '405' },
  { label: '406 - Not Acceptable', value: '406' },
  { label: '407 - Proxy Authentication Required', value: '407' },
  { label: '408 - Request Timeout', value: '408' },
  { label: '409 - Conflict', value: '409' },
  { label: '410 - Gone', value: '410' },
  { label: '411 - Length Required', value: '411' },
  { label: '412 - Precondition Failed', value: '412' },
  { label: '413 - Payload Too Large', value: '413' },
  { label: '414 - URI Too Long', value: '414' },
  { label: '415 - Unsupported Media Type', value: '415' },
  { label: '416 - Range Not Satisfiable', value: '416' },
  { label: '417 - Expectation Failed', value: '417' },
  { label: "418 - I'm a Teapot", value: '418' },
  { label: '421 - Misdirected Request', value: '421' },
  { label: '422 - Unprocessable Entity', value: '422' },
  { label: '423 - Locked', value: '423' },
  { label: '424 - Failed Dependency', value: '424' },
  { label: '425 - Too Early', value: '425' },
  { label: '426 - Upgrade Required', value: '426' },
  { label: '428 - Precondition Required', value: '428' },
  { label: '429 - Too Many Requests', value: '429' },
  { label: '431 - Request Header Fields Too Large', value: '431' },
  { label: '451 - Unavailable For Legal Reasons', value: '451' },
  // 5xx Server Errors
  { label: '500 - Internal Server Error', value: '500' },
  { label: '501 - Not Implemented', value: '501' },
  { label: '502 - Bad Gateway', value: '502' },
  { label: '503 - Service Unavailable', value: '503' },
  { label: '504 - Gateway Timeout', value: '504' },
  { label: '505 - HTTP Version Not Supported', value: '505' },
  { label: '506 - Variant Also Negotiates', value: '506' },
  { label: '507 - Insufficient Storage', value: '507' },
  { label: '508 - Loop Detected', value: '508' },
  { label: '510 - Not Extended', value: '510' },
  { label: '511 - Network Authentication Required', value: '511' },
];
