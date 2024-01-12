import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrightnessControlComponent } from './brightness-control.component';

describe('BrightnessControlComponent', () => {
  let component: BrightnessControlComponent;
  let fixture: ComponentFixture<BrightnessControlComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BrightnessControlComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BrightnessControlComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
