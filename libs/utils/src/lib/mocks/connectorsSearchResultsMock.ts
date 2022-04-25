import type { Connector } from '../models/connector';

export const connectorsSearchResultsMock: Connector[] = [
  {
    type: 'ServiceProvider',
    name: 'AzureBlob',
    id: '/serviceProviders/AzureBlob',
    properties: {
      displayName: 'Azure Blob',
      iconUri: 'https://connectoricons-prod.azureedge.net/releases/v1.0.1443/1.0.1443.2341/azureblob/icon.png',
      brandColor: '#804998',
      description: 'Connect to Azure Azure Blob Storage.',
      capabilities: ['triggers', 'actions'],
      connectionParameters: {
        connectionString: {
          type: 'securestring',
          // parameterSource 'AppConfiguration',
          uiDefinition: {
            displayName: 'Azure Blob Storage Connection String.',
            tooltip: 'Provide Azure Azure Blob Connection String.',
            constraints: { required: 'true' },
            description: 'The connection string representing Azure Blob Storage',
          },
        },
      },
    },
  },
  {
    type: 'ServiceProvider',
    name: 'azureTables',
    id: '/serviceProviders/azureTables',
    properties: {
      displayName: 'Azure Table Storage',
      iconUri: 'https://connectoricons-prod.azureedge.net/azuretables/icon_1.0.1274.1744.png',
      brandColor: '#804998',
      description: 'Connect to your Azure Table Storage to create, query and update, table entries and tables.',
      capabilities: ['actions'],
      connectionParameters: {
        connectionString: {
          type: 'securestring',
          // parameterSource 'AppConfiguration',
          uiDefinition: {
            displayName: 'Connection String',
            tooltip: 'Provide Connection String for Azure Table Storage.',
            constraints: { required: 'true' },
            description: 'The connection string for Azure Storage.',
          },
        },
      },
    },
  },
  {
    type: 'ServiceProvider',
    name: 'AzureCosmosDB',
    id: '/serviceProviders/AzureCosmosDB',
    properties: {
      displayName: 'Azure Cosmos DB',
      iconUri: 'https://connectoricons-prod.azureedge.net/releases/v1.0.1393/1.0.1393.2131/documentdb/icon.png',
      brandColor: '#804998',
      description: 'Connect to Azure Cosmos DB to perform document CRUD operations and listen to change feed processor.',
      capabilities: ['triggers', 'actions'],
      connectionParameters: {
        connectionString: {
          type: 'securestring',
          // parameterSource 'AppConfiguration',
          uiDefinition: {
            displayName: 'Connection string',
            tooltip: 'Provide Azure Cosmos DB connection string',
            constraints: { required: 'true' },
            description: 'Azure Cosmos DB connection string',
          },
        },
      },
    },
  },
  {
    type: 'ServiceProvider',
    name: 'DB2',
    id: '/serviceProviders/DB2',
    properties: {
      displayName: 'DB2',
      iconUri: 'https://connectoricons-prod.azureedge.net/releases/v1.0.1385/1.0.1385.2110/azurequeues/icon.png',
      brandColor: '#c4d5ff',
      description: 'The DB2 connector provides an API to work with DB2 databases.',
      capabilities: ['actions'],
      connectionParameters: {
        serverName: {
          type: 'string',
          // parameterSource 'AppConfiguration',
          uiDefinition: {
            displayName: 'Server name',
            tooltip: "The DB2 server name. Required if the connection string field isn't used. Otherwise, this value is ignored.",
            constraints: { required: 'false' },
            description: 'The DB2 server name.',
          },
        },
        portNumber: {
          type: 'int',
          // parameterSource 'AppConfiguration',
          uiDefinition: {
            displayName: 'Port number',
            tooltip:
              "The port number for the database on the DB2 server. Required if the connection string field isn't used. Otherwise, this value is ignored.",
            constraints: { required: 'false' },
            description: 'The port number for the database on the DB2 server.',
          },
        },
        database: {
          type: 'string',
          // parameterSource 'AppConfiguration',
          uiDefinition: {
            displayName: 'Database',
            tooltip:
              "The name of the database on the DB2 server. Required if the connection string field isn't used. Otherwise, this value is ignored.",
            constraints: { required: 'false' },
            description: 'The name of the database on the DB2 server.',
          },
        },
        userName: {
          type: 'string',
          // parameterSource 'AppConfiguration',
          uiDefinition: {
            displayName: 'User name',
            tooltip:
              "The user name for accessing the DB2 server. Required if the connection string field isn't used. Otherwise, this value is ignored.",
            constraints: { required: 'false' },
            description: 'The user name for accessing the DB2 server.',
          },
        },
        password: {
          type: 'securestring',
          // parameterSource 'AppConfiguration',
          uiDefinition: {
            displayName: 'Password',
            tooltip:
              "The password for the DB2 user name. Required if the connection string field isn't used. Otherwise, this value is ignored.",
            constraints: { required: 'false' },
            description: 'Password for the DB2 user name',
          },
        },
        packageCollection: {
          type: 'string',
          // parameterSource 'AppConfiguration',
          uiDefinition: {
            displayName: 'Package collection',
            tooltip: 'The package collection, which is optional and ignored if the connection string field is used.',
            constraints: { required: 'false' },
            description: 'The package collection.',
          },
        },
        defaultSchema: {
          type: 'string',
          // parameterSource 'AppConfiguration',
          uiDefinition: {
            displayName: 'Default schema',
            tooltip: 'The default schema for schema calls. This optional parameter is ignored if the connection string field is used.',
            constraints: { required: 'false' },
            description: 'The default schema for schema calls.',
          },
        },
        hostCCSID: {
          type: 'int',
          // parameterSource 'AppConfiguration',
          uiDefinition: {
            displayName: 'Host CCSID',
            tooltip: 'The host CCSID of the DB2 database. This optional parameter is ignored if the connection string field is used.',
            constraints: { required: 'false' },
            description: 'The host coded character set identifier (CCSID) of the DB2 database.',
          },
        },
        pcCodePage: {
          type: 'int',
          // parameterSource 'AppConfiguration',
          uiDefinition: {
            displayName: 'PC code page',
            tooltip: 'The PC code page, which is optional and ignored if the connection string field is used.',
            constraints: { required: 'false' },
            description: 'The PC code page for the DB2 connection.',
          },
        },
        additionalValues: {
          type: 'int',
          // parameterSource 'AppConfiguration',
          uiDefinition: {
            displayName: 'Additional connection string keywords',
            tooltip: 'Optional keywords to ignore if the connection string field is used.',
            constraints: { required: 'false' },
            description:
              "Optional keywords. For example, 'Default Qualifier=User2;DBMS Platform=DB2/AS400'. Multiple values should be separated by semi-colons",
          },
        },
        connectionString: {
          type: 'securestring',
          // parameterSource 'AppConfiguration',
          uiDefinition: {
            displayName: 'Connection string',
            tooltip:
              'You can use a DB2 connection string instead of the previous parameter values. This value overrides the other parameter values.',
            constraints: { required: 'false' },
            description: 'DB2 connection string',
          },
        },
      },
    },
  },
  {
    type: 'ServiceProvider',
    name: 'eventHub',
    id: '/serviceProviders/eventHub',
    properties: {
      displayName: 'Event Hubs',
      iconUri: 'https://connectoricons-prod.azureedge.net/eventhubs/icon_1.0.1274.1744.png',
      brandColor: '#c4d5ff',
      description: 'Connect to Azure Event Hubs to send and receive events.',
      capabilities: ['actions', 'triggers'],
      connectionParameters: {
        connectionString: {
          type: 'securestring',
          // parameterSource 'AppConfiguration',
          uiDefinition: {
            displayName: 'Connection String',
            tooltip: 'Provide Azure Event Hubs Connection String',
            constraints: { required: 'true' },
            description: 'Azure Event Hubs Connection String',
          },
        },
      },
    },
  },
  {
    type: 'ServiceProvider',
    name: 'Ftp',
    id: '/serviceProviders/Ftp',
    properties: {
      displayName: 'FTP',
      iconUri: 'https://connectoricons-prod.azureedge.net/releases/v1.0.1538/1.0.1538.2619/ftp/icon.png',
      brandColor: '#ff8a00',
      description: 'Connect to a FTP server to receive file updates.',
      capabilities: ['triggers', 'actions'],
      connectionParameters: {
        serverAddress: {
          type: 'string',
          // parameterSource 'AppConfiguration',
          uiDefinition: {
            displayName: 'Server Address',
            tooltip: 'The FTP server address to connect to',
            constraints: { required: 'true' },
            description: 'Server Address',
          },
        },
        username: {
          type: 'string',
          // parameterSource 'AppConfiguration',
          uiDefinition: {
            displayName: 'Username',
            tooltip: 'Username to use for login authentication',
            constraints: { required: 'true' },
            description: 'The username to use for login.',
          },
        },
        password: {
          type: 'securestring',
          // parameterSource 'AppConfiguration',
          uiDefinition: {
            displayName: 'Password',
            tooltip: 'Password for login authentication',
            constraints: { required: 'true' },
            description: 'The password to use for login',
          },
        },
        portNumber: {
          type: 'int',
          // parameterSource 'AppConfiguration',
          uiDefinition: {
            displayName: 'Port number',
            tooltip: "The port on which FTP server is listening. Default port is '21'",
            description: 'The FTP Port Number (example: 21)',
          },
        },
        enableSsl: {
          type: 'bool',
          // parameterSource 'AppConfiguration',
          uiDefinition: {
            displayName: 'Enable SSL?',
            tooltip: 'Specify if SSL needs to be enabled',
            description: 'Enable SSL? (True/False)',
          },
        },
        disableCertificateValidation: {
          type: 'bool',
          // parameterSource 'AppConfiguration',
          uiDefinition: {
            displayName: 'Disable Certificate Validation?',
            tooltip: 'Specify if Certificate validation needs to be disabled',
            description: 'Disable Certificate Validation? (True/False)',
          },
        },
        enableBinaryMode: {
          type: 'bool',
          // parameterSource 'AppConfiguration',
          uiDefinition: {
            displayName: 'Enable Binary Transport?',
            tooltip: 'Specify if Binary Transport needs to be enabled',
            description: 'Enable Binary Transport? (True/False)',
          },
        },
      },
    },
  },
  {
    type: 'ServiceProvider',
    name: 'hostfile',
    id: '/serviceProviders/hostfile',
    properties: {
      displayName: 'IBM Host File',
      iconUri: 'https://connectoricons-prod.azureedge.net/releases/v1.0.1385/1.0.1385.2110/azurequeues/icon.png',
      brandColor: '#c4d5ff',
      description: 'The IBM Host File connector provides an API to work with off-line files of IBM origin.',
      capabilities: ['actions'],
      connectionParameters: {
        codePage: {
          type: 'int',
          // parameterSource 'AppConfiguration',
          uiDefinition: {
            displayName: 'Code Page',
            tooltip: 'Code Page number to use for converting text',
            constraints: { required: 'false' },
            description: 'Code Page number to use for converting text',
          },
        },
        isISeries: {
          type: 'bool',
          // parameterSource 'AppConfiguration',
          uiDefinition: {
            displayName: 'From iSeries',
            tooltip: 'Do files originate from an iSeries',
            constraints: { required: 'false' },
            description: 'Do files originate from an iSeries',
          },
        },
      },
    },
  },
  {
    type: 'ServiceProvider',
    name: 'mq',
    id: '/serviceProviders/mq',
    properties: {
      displayName: 'MQ',
      iconUri: 'https://cdnforlogicappsv2.blob.core.windows.net/connectoricons-edge-prod/IBM/MQ-icon.png',
      brandColor: '#c4d5ff',
      description: 'The MQ connector provides an API to work with IBM MQ server.',
      capabilities: ['actions', 'triggers'],
      connectionParameters: {
        serverName: {
          type: 'string',
          // parameterSource 'AppConfiguration',
          uiDefinition: {
            displayName: 'Server name',
            tooltip: 'The host name for the MQ server',
            constraints: { required: 'true' },
            description: 'The host name for the MQ server',
          },
        },
        portNumber: {
          type: 'int',
          // parameterSource 'AppConfiguration',
          uiDefinition: {
            displayName: 'Port number',
            tooltip: 'The TCP port number for connecting to the MQ queue manager on the host',
            constraints: { required: 'true' },
            description: 'The TCP port number for connecting to the MQ queue manager on the host',
          },
        },
        channelName: {
          type: 'string',
          // parameterSource 'AppConfiguration',
          uiDefinition: {
            displayName: 'Channel',
            tooltip: 'The name for the MQ server connection channel',
            constraints: { required: 'true' },
            description: 'The name for the MQ server connection channel',
          },
        },
        queueManagerName: {
          type: 'string',
          // parameterSource 'AppConfiguration',
          uiDefinition: {
            displayName: 'Queue manager',
            tooltip: 'Queue manager name',
            constraints: { required: 'true' },
            description: 'Queue manager name',
          },
        },
        connectAs: {
          type: 'string',
          // parameterSource 'AppConfiguration',
          uiDefinition: {
            displayName: 'Connect As',
            tooltip: 'Connect As name',
            constraints: { required: 'true' },
            description: 'Connect As name',
          },
        },
        deadLetterQueueName: {
          type: 'string',
          // parameterSource 'AppConfiguration',
          uiDefinition: {
            displayName: 'Dead-letter queue name',
            tooltip: 'The dead-letter queue name',
            constraints: { required: 'false' },
            description: 'The dead-letter queue name',
          },
        },
        backupServerName: {
          type: 'string',
          // parameterSource 'AppConfiguration',
          uiDefinition: {
            displayName: 'Backup server name',
            tooltip: 'The name for the optional backup MQ server in a multi-instance queue manager setup',
            constraints: { required: 'false' },
            description: 'The name for the optional backup MQ server in a multi-instance queue manager setup',
          },
        },
        backupServerPortNumber: {
          type: 'int',
          // parameterSource 'AppConfiguration',
          uiDefinition: {
            displayName: 'Backup port number',
            tooltip: 'The optional backup port number in a multi-instance queue manager setup',
            constraints: { required: 'false' },
            description: 'The optional backup port number in a multi-instance queue manager setup',
          },
        },
        userName: {
          type: 'string',
          // parameterSource 'AppConfiguration',
          uiDefinition: {
            displayName: 'User name',
            tooltip: 'The optional username for connection authentication',
            constraints: { required: 'false' },
            description: 'The optional username for connection authentication',
          },
        },
        password: {
          type: 'securestring',
          // parameterSource 'AppConfiguration',
          uiDefinition: {
            displayName: 'Password',
            tooltip: 'The optional user password for connection authentication',
            constraints: { required: 'false' },
            description: 'The optional user password for connection authentication',
          },
        },
        maxConnections: {
          type: 'int',
          // parameterSource 'AppConfiguration',
          uiDefinition: {
            displayName: 'Max connections',
            tooltip: 'The optional maximum number of pooled connections for the flow. The default is 10 connections.',
            constraints: { required: 'false' },
            description: 'The optional maximum number of pooled connections for the flow. The default is 10 connections.',
          },
        },
        connectionTimeoutSeconds: {
          type: 'int',
          // parameterSource 'AppConfiguration',
          uiDefinition: {
            displayName: 'Connection timeout',
            tooltip: 'The optional time out period in seconds for a pooled connection. The default is 120 seconds.',
            constraints: { required: 'false' },
            description: 'The optional time out period in seconds for a pooled connection. The default is 120 seconds.',
          },
        },
        useTLS: {
          type: 'bool',
          // parameterSource 'AppConfiguration',
          uiDefinition: {
            displayName: 'Use TLS',
            tooltip: 'Optional TLS connection',
            constraints: { required: 'false' },
          },
        },
        clientCertThumbprint: {
          type: 'securestring',
          // parameterSource 'AppConfiguration',
          uiDefinition: {
            displayName: 'Client Cert Thumbprint',
            tooltip: 'The client certificate thumbprint for use with Mutual TLS authentication',
            constraints: { required: 'false' },
            description: 'The client certificate thumbprint for use with Mutual TLS authentication',
          },
        },
      },
    },
  },
  {
    type: 'ServiceProvider',
    name: 'serviceBus',
    id: '/serviceProviders/serviceBus',
    properties: {
      displayName: 'Service Bus',
      iconUri: 'https://connectoricons-prod.azureedge.net/servicebus/icon_1.0.1274.1744.png',
      brandColor: '#c4d5ff',
      description: 'Connect to Azure Service Bus to send and receive messages.',
      capabilities: ['actions', 'triggers'],
      connectionParameters: {
        connectionString: {
          type: 'securestring',
          // parameterSource 'AppConfiguration',
          uiDefinition: {
            displayName: 'Connection String',
            tooltip: 'Provide Azure Service Bus Connection String',
            constraints: { required: 'true' },
            description: 'Azure Service Bus Connection String',
          },
        },
      },
    },
  },
  {
    type: 'ServiceProvider',
    name: 'Sftp',
    id: '/serviceProviders/Sftp',
    properties: {
      displayName: 'SFTP',
      iconUri: 'https://connectoricons-prod.azureedge.net/sftpwithssh/icon_1.0.1355.2021.png',
      brandColor: '#e8bb00',
      description: 'Connect to a SFTP server to receive file updates.',
      capabilities: ['triggers', 'actions'],
      connectionParameters: {
        sshHostAddress: {
          type: 'string',
          // parameterSource 'AppConfiguration',
          uiDefinition: {
            displayName: 'SSH host addresss',
            constraints: { required: 'true' },
            description: 'IP or hostname of the SSH server host.',
          },
        },
        username: {
          type: 'string',
          // parameterSource 'AppConfiguration',
          uiDefinition: {
            displayName: 'Username',
            tooltip: 'Username to use for login authentication',
            constraints: { required: 'true' },
            description: 'The username to use for login.',
          },
        },
        password: {
          type: 'securestring',
          // parameterSource 'AppConfiguration',
          uiDefinition: {
            displayName: 'Password',
            tooltip: 'Password for login authentication. Ignore this if using key based authentication',
            description: 'The password to use for login.',
          },
        },
        portNumber: {
          type: 'int',
          // parameterSource 'AppConfiguration',
          uiDefinition: {
            displayName: 'Port number',
            tooltip: "The port on which SFTP server is listening. If left blank, logic app will use default SSH port '22' to connect",
            description: 'The SFTP server port number.',
          },
        },
        rootDirectory: {
          type: 'string',
          // parameterSource 'AppConfiguration',
          uiDefinition: {
            displayName: 'Root directory',
            tooltip: 'Root directory on remote server to connect with',
            description: 'The root directory.',
          },
        },
        sshPrivateKey: {
          type: 'string',
          // parameterSource 'AppConfiguration',
          uiDefinition: {
            displayName: 'SSH Private Key',
            tooltip:
              "The content of the SSH private key entirely in the multiline format with line separator char '\\n' present to separate the lines. This is mandatory if password is not provided",
          },
        },
        sshPrivateKeyPassphrase: {
          type: 'securestring',
          // parameterSource 'AppConfiguration',
          uiDefinition: {
            displayName: 'SSH private key passphrase',
            tooltip: 'Passphrase (if any) to decrypt your private key. Ignore this if not providing a private key',
          },
        },
        sshHostKeyFingerprint: {
          type: 'string',
          // parameterSource 'AppConfiguration',
          uiDefinition: {
            displayName: 'Host Key Fingerprint',
            tooltip:
              "The fingerprint of SSH host's public key in MD5 format as per RFC spec - https://datatracker.ietf.org/doc/html/rfc4716#section-4",
          },
        },
      },
    },
  },
  {
    type: 'ServiceProvider',
    name: 'sql',
    id: '/serviceProviders/sql',
    properties: {
      displayName: 'SQL Server',
      iconUri: 'https://connectoricons-prod.azureedge.net/sql/icon_1.0.1339.1981.png',
      brandColor: '#c4d5ff',
      description: 'The SQL Server connector provides an API to work with SQL Databases.',
      capabilities: ['actions'],
      connectionParameters: {
        connectionString: {
          type: 'securestring',
          // parameterSource 'AppConfiguration',
          uiDefinition: {
            displayName: 'Connection String',
            tooltip: 'Provide SQL connection string',
            constraints: { required: 'true' },
            description: 'SQL connection string.',
          },
        },
      },
    },
  },
];
