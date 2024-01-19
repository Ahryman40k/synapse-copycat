import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EffectsControlComponent } from './effects-control.component';

describe('EffectsControlComponent', () => {
  let component: EffectsControlComponent;
  let fixture: ComponentFixture<EffectsControlComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EffectsControlComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(EffectsControlComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
