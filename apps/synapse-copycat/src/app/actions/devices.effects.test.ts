/* eslint-disable @typescript-eslint/no-unused-vars */
/*
import { TestBed } from '@angular/core/testing';
import { Actions } from '@ngrx/effects';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Observable } from 'rxjs';
import { DeviceEffects } from './devices.effects';
import { AppState } from './devices.reducer';

import { mockIPC } from "@tauri-apps/api/mocks";
// import { invoke } from "@tauri-apps/api/tauri";

describe('Devices Effects', () => {
  let effects: DeviceEffects;
  let actions$: Observable<unknown>;
  let store: MockStore<AppState>;

  const initialState: AppState = {
    devices: {
      usb: [],
      connected: [],
    },
  };

  beforeEach(() => {
    mockIPC((cmd, args) => {
      // simulated rust command called "add" that just adds two numbers
     
    });

    TestBed.configureTestingModule({
      providers: [
        DeviceEffects,
        provideMockActions(() => actions$),
        provideMockStore({ initialState }),
      ],
    });

    effects = TestBed.inject(DeviceEffects);
    actions$ = TestBed.inject(Actions);
    store = TestBed.inject(MockStore<AppState>);
  });

  it('Should discover devices', () => {});
});
*/

describe ("TODO", () => {
  it('Should discover devices', () => {});
})