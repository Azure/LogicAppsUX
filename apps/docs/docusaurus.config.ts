import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Azure Logic Apps UX Docs',
  favicon: 'img/favicon.ico',

  // Set the production url of your site here
  url: 'https://learn.microsoft.com',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'Azure', // Usually your GitHub org/user name.
  projectName: 'LogicAppsUX', // Usually your repo name.

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },
  plugins: [
    [
      'docusaurus-plugin-remote-content',
      {
        // options here
        name: 'changelog-gen', // used by CLI, must be path safe
        sourceBaseUrl: 'https://raw.githubusercontent.com/Azure/LogicAppsUX/main/', // the base url for the markdown (gets prepended to all of the documents when fetching)
        outDir: 'src/components', // the base directory to output to.
        documents: ['CHANGELOG.md'], // the file names to download
      },
    ],
  ],
  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: '/',
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl: 'https://github.com/Azure/LogicAppsUX/tree/main/docs/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    // Replace with your project's social card
    image: 'img/docusaurus-social-card.jpg',
    navbar: {
      title: 'Azure Logic Apps UX',
      logo: {
        alt: 'Azure Logo',
        src: 'img/logicapp.png',
      },
      items: [
        {
          type: 'doc',
          docId: 'intro',
          position: 'left',
          label: 'Docs',
        },
        {
          to: 'changelog',
          docId: 'changelog',
          position: 'left',
          label: 'Changelog',
        },
        {
          href: 'https://github.com/Azure/LogicAppsUX',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
