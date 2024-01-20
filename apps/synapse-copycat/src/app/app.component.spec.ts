
/*import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { RouterTestingModule } from '@angular/router/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { AppState } from './actions';

describe('AppComponent', () => {
  
  let store: MockStore;
  const initialState: AppState = {
    devices: {
    usb: [],
    connected: [],
  }
  }
  
  beforeEach(async () => {
    const a = await TestBed.configureTestingModule({
      imports: [AppComponent, RouterTestingModule],
      providers: [
        provideMockStore( {initialState} ),
      ],
    });
    store = TestBed.inject(MockStore);
    a.compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it(`should have as title 'synapse-copycat'`, () => {
    const fixture = TestBed.createComponent(AppComponent);

    store.setState({ initialState });

    const app = fixture.componentInstance;
    expect(app.title).toEqual('synapse-copycat');
  });

 
});
*/

describe ("TODO", () => {
  it('Should test something', () => {});
})