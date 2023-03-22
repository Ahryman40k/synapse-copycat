import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { provideMockStore } from '@ngrx/store/testing';
import { Meta, moduleMetadata } from '@storybook/angular';
import { AppState } from '../../actions';
import { UsbDevice } from '../../models';

import { NavbarComponent } from './navbar.component';


const usbDevices: UsbDevice[] = [{
  kind:'mouse',
  name: 'Razer Mouse Trucmuche',
  visual: ''
}]

const mockedAppState: AppState = {
  devices: {
    connected: [],
    usb: usbDevices
  }
} 


export default {
  title: 'Components / Nav bar',
  component: NavbarComponent,
  decorators: [
    moduleMetadata({
      imports: [
        CommonModule,
        RouterModule,
      //  provideMockStore({ initialState: mockedAppState}),
      ]
    })
  ]
} as Meta<NavbarComponent>;


const Template = () => `
  <synapse-copycat-navbar>
  </synapse-copycat-navbar>
 `

export const Primary = Template.bind({});

