import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AppBar } from '../../../appbar/appbar';
import { Navigation } from '../../navigation/navigation';

/**
 * The application shell: the bar, and whatever the router puts under it.
 *
 * It arranges and binds, and knows nothing else. What an address means belongs
 * to `Navigation`, which already owns the other direction; the bar's
 * outputs go straight there rather than through methods that only forward.
 */
@Component({
	selector: 'default-layout',
	styleUrl: './default-layout.scss',
	templateUrl: './default-layout.html',
	imports: [RouterModule, AppBar],
})
export class DefaultLayout {
	protected readonly navigation = inject(Navigation);

	// Nothing data-driven is in the bar, so the shell reads no store at all.
	// Devices are tiles on the dashboard, inside the group driving them; modules
	// went with the `modules` command Rust never registered — see `AppBar`.
}
