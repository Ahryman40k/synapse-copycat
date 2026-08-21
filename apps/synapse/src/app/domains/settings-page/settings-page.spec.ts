import {
	provideBackendApi,
	unusedCommands,
	withMock,
} from '@synapse-copycat/backend-api';
import { render, screen } from '@testing-library/angular';
import { SettingsPage } from './settings-page';

const setup = () =>
	render(SettingsPage, {
		providers: [
			provideBackendApi(
				withMock({
					...unusedCommands(),
					devices: [],
					modules: [],
				}),
			),
		],
	});

describe('SettingsPage', () => {
	it('is titled, and shows both panels', async () => {
		await setup();

		expect(screen.getByRole('heading', { name: 'Settings' })).toBeVisible();
		expect(screen.getByRole('heading', { name: 'Language' })).toBeVisible();
		expect(screen.getByRole('heading', { name: 'About' })).toBeVisible();
	});

	it('has no tab bar', async () => {
		await setup();

		// One page, nothing to choose between: a bar would be furniture.
		expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
	});

	it('opens on English, the only language there is', async () => {
		await setup();

		const language = screen.getByRole('combobox', {
			name: 'Interface language',
		}) as HTMLSelectElement;
		expect(language.value).toBe('en');
		expect(screen.getAllByRole('option')).toHaveLength(1);
	});

	it('points at the project rather than describing it', async () => {
		await setup();

		// A real link: copyable, openable in a new tab, announced as a link.
		const link = screen.getByRole('link', {
			name: /Ahryman40k\/synapse-copycat/,
		});
		expect(link).toHaveAttribute(
			'href',
			'https://github.com/Ahryman40k/synapse-copycat',
		);
		expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
	});

	it('shows no version, having none to show', async () => {
		await setup();

		// `package.json` says 0.0.0 and neither it nor tauri.conf.json reaches
		// the bundle; a wrong number would be worse than none.
		expect(screen.queryByText(/Version/)).not.toBeInTheDocument();
	});
});
