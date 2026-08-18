import { render, screen } from '@testing-library/angular';
import { MouseCustomizePanelComponent } from './mouse-customize';

const setup = (inputs: Record<string, unknown> = {}) =>
	render(MouseCustomizePanelComponent, { inputs });

const control = (name: string) => screen.getByRole('radio', { name });
const kind = () =>
	screen.getByRole('combobox', { name: 'Assign to' }) as HTMLSelectElement;

describe('MouseCustomizeSection', () => {
	it('lists the controls and opens on the first', async () => {
		await setup();

		expect(
			screen.getByRole('radiogroup', { name: 'Mouse controls' }),
		).toBeVisible();
		expect(control('Left click')).toBeChecked();
		expect(screen.getByRole('heading', { name: 'Left click' })).toBeVisible();
	});

	it('follows the control that is picked', async () => {
		const { fixture } = await setup();

		control('Forward').click();
		fixture.detectChanges();

		expect(screen.getByRole('heading', { name: 'Forward' })).toBeVisible();
	});

	it('records an assignment against the layer showing', async () => {
		const { fixture } = await setup();

		control('Forward').click();
		fixture.detectChanges();
		kind().value = 'disabled';
		kind().dispatchEvent(new Event('change'));
		fixture.detectChanges();

		expect(fixture.componentInstance.bindings().default['button-5']).toEqual({
			kind: 'disabled',
		});
		expect(fixture.componentInstance.bindings().hypershift).toEqual({});
	});

	it('keeps each layer to itself', async () => {
		const { fixture } = await setup({
			bindings: {
				default: { 'button-5': { kind: 'disabled' } },
				hypershift: { 'button-5': { kind: 'text', text: 'gg' } },
			},
		});

		control('Forward').click();
		fixture.detectChanges();
		expect(kind().value).toBe('disabled');

		screen.getByRole('radio', { name: 'Hypershift' }).click();
		fixture.detectChanges();

		// Same control, other layer, other assignment.
		expect(kind().value).toBe('text');
	});

	it('marks the controls that are no longer on their default', async () => {
		const { container } = await setup({
			bindings: {
				default: { 'button-4': { kind: 'disabled' } },
				hypershift: {},
			},
		});

		expect(container.querySelectorAll('.mouse-customize__dot')).toHaveLength(1);
	});

	it('drops the mark when a control goes back to its default', async () => {
		const { container, fixture } = await setup({
			bindings: {
				default: { 'button-4': { kind: 'disabled' } },
				hypershift: {},
			},
		});

		control('Back').click();
		fixture.detectChanges();
		kind().value = 'default';
		kind().dispatchEvent(new Event('change'));
		fixture.detectChanges();

		expect(container.querySelectorAll('.mouse-customize__dot')).toHaveLength(0);
	});
});
