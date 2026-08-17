import { render, screen } from '@testing-library/angular';
import { Battery } from './battery';

const setup = (inputs: Record<string, unknown>) => render(Battery, { inputs });

const gauge = () => screen.getByRole('img');

describe('Battery', () => {
	it('reads out its level and what it is doing', async () => {
		await setup({ level: 62 });

		// One accessible name for the whole gauge: the drawing is hidden, so a
		// screen reader hears a sentence rather than "62%" with no context.
		expect(gauge()).toHaveAccessibleName('Battery 62%, discharging');
	});

	it('says when it is charging', async () => {
		await setup({ level: 62, charging: true });

		expect(gauge()).toHaveAccessibleName('Battery 62%, charging');
		expect(gauge()).toHaveClass('syn-battery--charging');
	});

	it('shows the figure beside the cell', async () => {
		await setup({ level: 62 });

		expect(screen.getByText('62%')).toBeVisible();
	});

	it('marks a nearly empty battery', async () => {
		await setup({ level: 12 });

		expect(gauge()).toHaveClass('syn-battery--low');
	});

	it('does not call a charging battery low', async () => {
		await setup({ level: 5, charging: true });

		// Being filled is its own state, and a good one: it should not read as
		// an alarm even at 5%.
		expect(gauge()).not.toHaveClass('syn-battery--low');
	});

	it('brings an impossible level back into range', async () => {
		const { container, fixture } = await setup({ level: 140 });
		expect(screen.getByText('100%')).toBeVisible();

		fixture.componentRef.setInput('level', -20);
		fixture.detectChanges();
		expect(screen.getByText('0%')).toBeVisible();

		// Even empty it still reads as a battery rather than a bare outline.
		const fill = container.querySelector('.syn-battery__fill');
		expect(Number(fill?.getAttribute('width'))).toBeGreaterThan(0);
	});

	it('fills in proportion to the level', async () => {
		const { container } = await setup({ level: 50 });

		// Half of the 18 units the cell has to give.
		expect(container.querySelector('.syn-battery__fill')).toHaveAttribute(
			'width',
			'9',
		);
	});

	it('draws the bolt only while charging', async () => {
		const { container, fixture } = await setup({ level: 40 });
		expect(container.querySelector('.syn-battery__bolt')).toBeNull();

		fixture.componentRef.setInput('charging', true);
		fixture.detectChanges();

		expect(container.querySelector('.syn-battery__bolt')).not.toBeNull();
	});

	it('takes a name of its own when given one', async () => {
		await setup({ level: 62, ariaLabel: 'Mouse battery' });

		expect(gauge()).toHaveAccessibleName('Mouse battery');
	});
});
