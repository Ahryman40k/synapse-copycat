import { TestBed } from '@angular/core/testing';

import { UsbDevicesService } from './usb-devices.service';

describe('UsbDevicesService', () => {
  let service: UsbDevicesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UsbDevicesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
