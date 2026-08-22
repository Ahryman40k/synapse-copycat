import {
	ChangeDetectionStrategy,
	Component,
	input,
	output,
} from '@angular/core';
import { Panel, SwitchComponent } from '@synapse-copycat/ui';
import {
	type Source,
	type Sources,
	SOURCE_DETAILS,
	SOURCE_LABELS,
	SOURCES_DEFAULT,
	SOURCES_UNAVAILABLE,
} from '../../models/source';

/** One row: the protocol, what it costs, and whether it is looked for. */
type Row = {
	source: Source;
	label: string;
	detail: string;
	enabled: boolean;
	/** Nothing implements it, so the switch is there to be seen, not used. */
	unavailable: boolean;
};

const ORDER: readonly Source[] = ['chroma', 'twinkly', 'govee'];

/**
 * Which protocols the application looks for.
 *
 * One switch per protocol rather than one for "discovery", because each costs
 * something different. Chroma is a call to a daemon that is either running or
 * not; Twinkly is a sweep of the whole subnet, which is a reasonable thing to
 * refuse on a large network, on a metered link, or simply because there are
 * none.
 *
 * ⚠️ A protocol with nothing behind it is shown **disabled**, not hidden. A
 * switch that turns on something that does not exist is the worst of the three
 * options; hiding it makes the plan invisible; showing it off with a reason
 * says what is true.
 */
@Component({
	selector: 'sources-panel',
	templateUrl: './sources-panel.html',
	styleUrl: './sources-panel.scss',
	imports: [Panel, SwitchComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SourcesPanel {
	readonly sources = input<Sources>(SOURCES_DEFAULT);

	readonly sourceChange = output<{ source: Source; enabled: boolean }>();

	protected readonly rows = (): Row[] =>
		ORDER.map((source) => ({
			source,
			label: SOURCE_LABELS[source],
			detail: SOURCE_DETAILS[source],
			enabled: this.sources()[source],
			unavailable: SOURCES_UNAVAILABLE.includes(source),
		}));

	protected onChange(source: Source, enabled: boolean): void {
		this.sourceChange.emit({ source, enabled });
	}
}
