import { defineConfig } from 'vitepress';

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: 'Synapse',
  description:
    'A linux Razer Synapse copycat to manage RGB lightning peripherals on GNU/Linux',

  cacheDir: '../../dist/.vitepress/cache',
  outDir: '../../dist/apps/docsite',

  themeConfig: {
    docFooter: {
      prev: false,
      next: false,
    },

    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Features', link: '/features/' },
      { text: "User's Guide", link: '/guide/' },
      { text: 'Technical', link: '/technical/' },
    ],

    sidebar: {
      '/features/': [
        {
          text: 'Features',
          items: [
            { text: 'feature 01', link: '/features/f01' },
            { text: 'feature 02', link: '/features/f02' },
          ],
        },
      ],
      '/guide/': [
        {
          text: 'Guide',
          items: [
            { text: 'guide 01', link: '/guide/g01' },
            { text: 'guide 02', link: '/guide/g02' },
          ],
        },
      ],
      '/technical/': [
        {
          text: 'Technical',
          items: [
            { text: 'tech 01', link: '/tech/t01' },
            { text: 'tech 02', link: '/tech/t02' },
          ],
        },
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/Ahryman40k/synapse-copycat' },
    ],
  },
});
