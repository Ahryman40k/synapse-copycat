import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChromaVisualiserCopycatComponent } from './chroma-visualiser-copycat.component';

describe('ChromaVisualiserCopycatComponent', () => {
  let component: ChromaVisualiserCopycatComponent;
  let fixture: ComponentFixture<ChromaVisualiserCopycatComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChromaVisualiserCopycatComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ChromaVisualiserCopycatComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
