import { TestBed } from '@angular/core/testing';

import { ConnectedDevicesService } from './connected-devices.service';

describe('ConnectedDevicesService', () => {
  let service: ConnectedDevicesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ConnectedDevicesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
