import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AxonCopycatComponent } from './axon-copycat.component';

describe('AxonCopycatComponent', () => {
  let component: AxonCopycatComponent;
  let fixture: ComponentFixture<AxonCopycatComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AxonCopycatComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AxonCopycatComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
