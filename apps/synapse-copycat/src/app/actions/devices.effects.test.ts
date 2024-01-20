import { TestBed } from '@angular/core/testing';
import { Actions } from '@ngrx/effects';
import { provideMockStore } from '@ngrx/store/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Observable } from 'rxjs';
import { DeviceEffects } from './devices.effects';
import { AppState } from './devices.reducer';

describe('Devices Effects', () => {
  // let effects: DeviceEffects;
  let actions$: Observable<unknown>;
  // let store: MockStore<AppState>;

  const initialState: AppState = {
    devices: {
      usb: [],
      connected: [],
    },
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        DeviceEffects,
        provideMockActions(() => actions$),
        provideMockStore({ initialState }),
      ],
    });

    // effects = TestBed.inject(DeviceEffects);
    actions$ = TestBed.inject(Actions);
    // store = TestBed.inject(MockStore<AppState>);
  });

  it('Should discover devices', () => {});
});
