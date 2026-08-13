import { Component, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import type { Device, Module } from '@synapse-copycat/backend-api';
import { AppBar } from '../../../appbar/appbar';
import { ApplicationStore } from '../../stores/application-store';

@Component({
	selector: 'default-layout',
	styleUrl: './default-layout.scss',
	templateUrl: './default-layout.html',
	imports: [RouterModule, AppBar],
})
export class DefaultLayout {
	#store = inject(ApplicationStore);
	#router = inject(Router);

	devices = this.#store.devices;
	modules = this.#store.modules;

	activateDevice(device: Device): void {
		this.#router.navigate(['device', device.kind]);
	}

	activateModule(module: Module): void {
		this.#router.navigate(['module', module.kind]);
	}

	goHome(): void {
		this.#router.navigateByUrl('/');
	}
}
