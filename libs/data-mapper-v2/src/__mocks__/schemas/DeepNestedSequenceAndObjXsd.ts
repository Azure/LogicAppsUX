import type { DataMapSchema } from '@microsoft/logic-apps-shared';

const DeepNestedSequenceAndObjXsd: DataMapSchema = {
  name: 'Edifact.xsd',
  type: 'XML',
  targetNamespace: 'http://www.contoso.com/books',
  namespaces: {
    xs: 'http://www.w3.org/2001/XMLSchema',
    ns0: 'http://www.contoso.com/books',
  },
  schemaTreeRoot: {
    key: '/ns0:bookstore',
    name: 'bookstore',
    type: 'Complex',
    properties: 'None',
    children: [
      {
        key: '/ns0:bookstore/ns0:book',
        name: 'book',
        type: 'Complex',
        properties: 'Repeating',
        children: [
          {
            key: '/ns0:bookstore/ns0:book/ns0:book2',
            name: 'book2',
            type: 'Complex',
            properties: 'Repeating',
            children: [
              {
                key: '/ns0:bookstore/ns0:book/ns0:book2/ns0:book3',
                name: 'book3',
                type: 'Complex',
                properties: 'Repeating',
                children: [
                  {
                    key: '/ns0:bookstore/ns0:book/ns0:book2/ns0:book3/ns0:name',
                    name: 'name',
                    type: 'String',
                    properties: 'Optional',
                    qName: 'ns0:name',
                    children: [],
                  },
                ],
                qName: 'ns0:book3',
              },
              {
                key: '/ns0:bookstore/ns0:book/ns0:book2/ns0:author',
                name: 'author',
                type: 'Complex',
                properties: 'None',
                children: [
                  {
                    key: '/ns0:bookstore/ns0:book/ns0:book2/ns0:author/ns0:name',
                    name: 'name',
                    type: 'String',
                    properties: 'Optional',
                    qName: 'ns0:name',
                    children: [],
                  },
                  {
                    key: '/ns0:bookstore/ns0:book/ns0:book2/ns0:author/ns0:first-name',
                    name: 'first-name',
                    type: 'String',
                    properties: 'Optional',
                    qName: 'ns0:first-name',
                    children: [],
                  },
                  {
                    key: '/ns0:bookstore/ns0:book/ns0:book2/ns0:author/ns0:last-name',
                    name: 'last-name',
                    type: 'String',
                    properties: 'Optional',
                    qName: 'ns0:last-name',
                    children: [],
                  },
                  {
                    key: '/ns0:bookstore/ns0:book/ns0:book2/ns0:author/ns0:publisher',
                    name: 'publisher',
                    type: 'Complex',
                    properties: 'Optional',
                    qName: 'ns0:publisher',
                    children: [
                      {
                        key: '/ns0:bookstore/ns0:book/ns0:book2/ns0:author/ns0:publisher/ns0:line1',
                        name: 'line1',
                        type: 'String',
                        properties: 'Optional',
                        qName: 'ns0:line1',
                        children: [],
                      },
                    ],
                  },
                ],
                qName: 'ns0:author',
              },
            ],
            qName: 'ns0:book2',
          },
          {
            key: '/ns0:bookstore/ns0:book/ns0:title',
            name: 'name',
            type: 'String',
            properties: 'Optional',
            qName: 'ns0:title',
            children: [],
          },
        ],
        qName: 'ns0:book',
      },
    ],
    qName: 'ns0:bookstore',
  },
};

export default DeepNestedSequenceAndObjXsd;
