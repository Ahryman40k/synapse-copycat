import nx from '@nx/eslint-plugin';
import storybook from 'eslint-plugin-storybook';
import baseConfig from '../../eslint.config.mjs';

export default [
	...baseConfig,
	...nx.configs['flat/angular'],
	...nx.configs['flat/angular-template'],
	// The app already had this; libs/ui did not, so its stories escaped the
	// rules by accident — including the one that keeps them off
	// @testing-library/angular in favour of storybook/test.
	...storybook.configs['flat/recommended'],
	{
		files: ['**/*.ts'],
		rules: {
			'@angular-eslint/directive-selector': [
				'error',
				{
					type: 'attribute',
					prefix: 'syn',
					style: 'camelCase',
				},
			],
			// `attribute` is allowed alongside `element`: a component that must
			// render on a native host — `button[syn-button]`, so the browser
			// supplies the role, the tab stop and `disabled` — has no element
			// form at all. The `syn` prefix is still enforced on both.
			'@angular-eslint/component-selector': [
				'error',
				{
					type: ['element', 'attribute'],
					prefix: 'syn',
					style: 'kebab-case',
				},
			],
		},
	},
	{
		files: ['**/*.html'],
		// Override or add rules here
		rules: {},
	},
];
