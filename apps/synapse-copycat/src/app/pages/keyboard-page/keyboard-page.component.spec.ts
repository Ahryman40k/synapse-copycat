import { ComponentFixture, TestBed } from '@angular/core/testing';
import { KeyboardPageComponent } from './keyboard-page.component';

describe('KeyboardPageComponent', () => {
  let component: KeyboardPageComponent;
  let fixture: ComponentFixture<KeyboardPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KeyboardPageComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(KeyboardPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
