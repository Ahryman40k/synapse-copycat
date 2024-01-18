import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LightingControlComponent } from './lighting-control.component';

describe('LightingControlComponent', () => {
  let component: LightingControlComponent;
  let fixture: ComponentFixture<LightingControlComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LightingControlComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LightingControlComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
