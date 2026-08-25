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
			{ text: 'Product', link: '/product/' },
			{ text: 'Design', link: '/design/' },
			{ text: 'QA', link: '/qa/report' },
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
				{
					text: 'Handover',
					items: [{ text: 'Backend', link: '/technical/backend-handover' }],
				},
			],
			'/product/': [
				{
					text: 'Product',
					items: [
						{ text: 'Start here', link: '/product/' },
						{ text: 'Feature inventory', link: '/product/features' },
						{ text: 'Open decisions', link: '/product/open-decisions' },
						{ text: 'Plan and outcomes', link: '/product/plan' },
						{ text: 'Core journeys', link: '/product/journeys' },
						{ text: 'Tickets', link: '/product/tickets/' },
					],
				},
			],
			'/design/': [
				{
					text: 'Design',
					items: [
						{ text: 'Start here', link: '/design/' },
						{ text: 'Personas', link: '/design/personas' },
						{ text: 'User flows', link: '/design/flows' },
						{ text: 'Wireframes', link: '/design/wireframes' },
						{ text: 'Background management', link: '/design/backgrounds-flow' },
						{ text: 'Effect studio', link: '/design/studio-flow' },
						{ text: 'Capability states', link: '/design/capability-states' },
						{
							text: 'Disabled-state patterns',
							link: '/design/disabled-state-patterns',
						},
						{ text: 'DPI staging', link: '/design/dpi-staging' },
						{ text: 'Usability findings', link: '/design/usability-findings' },
						{ text: 'Accessibility', link: '/design/accessibility' },
					],
				},
			],
			'/qa/': [
				{
					text: 'QA',
					items: [{ text: 'Test report', link: '/qa/report' }],
				},
			],
		},

		socialLinks: [
			{ icon: 'github', link: 'https://github.com/Ahryman40k/synapse-copycat' },
		],
	},
});
