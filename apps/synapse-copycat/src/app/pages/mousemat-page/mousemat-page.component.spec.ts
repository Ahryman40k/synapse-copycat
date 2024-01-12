import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MousematPageComponent } from './mousemat-page.component';

describe('MousematPageComponent', () => {
  let component: MousematPageComponent;
  let fixture: ComponentFixture<MousematPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MousematPageComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MousematPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
