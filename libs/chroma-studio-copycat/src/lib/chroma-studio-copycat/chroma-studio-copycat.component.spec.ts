import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChromaStudioCopycatComponent } from './chroma-studio-copycat.component';

describe('ChromaStudioCopycatComponent', () => {
  let component: ChromaStudioCopycatComponent;
  let fixture: ComponentFixture<ChromaStudioCopycatComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChromaStudioCopycatComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ChromaStudioCopycatComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
