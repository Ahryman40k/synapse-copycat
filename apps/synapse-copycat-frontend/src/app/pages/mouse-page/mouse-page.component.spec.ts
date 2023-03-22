import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MousePageComponent } from './mouse-page.component';

describe('MousePageComponent', () => {
  let component: MousePageComponent;
  let fixture: ComponentFixture<MousePageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MousePageComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MousePageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
