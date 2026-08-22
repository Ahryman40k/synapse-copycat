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
					items: [{ text: 'What it does', link: '/features/' }],
				},
			],
			'/guide/': [
				{
					text: "User's Guide",
					items: [{ text: 'Getting started', link: '/guide/' }],
				},
			],
			'/technical/': [
				{
					text: 'Technical',
					items: [
						{ text: 'How it is built', link: '/technical/' },
						{ text: 'The rendering engine', link: '/technical/engine' },
						{ text: 'The protocol libraries', link: '/technical/protocols' },
						{ text: 'How it is verified', link: '/technical/testing' },
					],
				},
			],
		},

		socialLinks: [
			{ icon: 'github', link: 'https://github.com/Ahryman40k/synapse-copycat' },
		],
	},
});
