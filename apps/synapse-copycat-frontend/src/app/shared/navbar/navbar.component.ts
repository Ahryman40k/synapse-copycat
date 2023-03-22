import { ChangeDetectionStrategy, Component, inject, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { featherX, featherSquare, featherMinimize2, featherSettings } from '@ng-icons/feather-icons';
import { Store } from '@ngrx/store';
import { connectedSelector, usbSelector } from '../../actions';
import { ConnectedDevice, UsbDevice } from '../../models';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

@Component({
  selector: 'synapse-copycat-navbar',
  standalone: true,
  imports: [
    CommonModule,
    NgIconComponent, 
    RouterModule,
  ],
  providers: [
    provideIcons({ featherX, featherSquare, featherMinimize2, featherSettings })
  ],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,

})
export class NavbarComponent {
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute)

  readonly usb$ = this.store.select(usbSelector)
  readonly connected$ = this.store.select(connectedSelector)


  showDevicePage( device: UsbDevice | ConnectedDevice ): void {
    this.router.navigate([device.kind], {relativeTo: this.route })
  }

}
