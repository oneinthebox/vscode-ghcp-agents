import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CompanySearchComponent } from './company-search.component';
import { ResearchService } from '../../services/research.service';

describe('CompanySearchComponent', () => {
  let component: CompanySearchComponent;
  let fixture: ComponentFixture<CompanySearchComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CompanySearchComponent],
      imports: [
        HttpClientTestingModule,
        RouterTestingModule,
        NoopAnimationsModule,
        FormsModule,
        MatTableModule,
        MatSortModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatIconModule,
        MatButtonModule,
        MatProgressSpinnerModule,
      ],
      providers: [ResearchService]
    }).compileComponents();

    fixture = TestBed.createComponent(CompanySearchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have default empty search query', () => {
    expect(component.searchQuery).toBe('');
  });

  it('should have defined display columns', () => {
    expect(component.displayedColumns.length).toBeGreaterThan(0);
    expect(component.displayedColumns).toContain('ticker');
    expect(component.displayedColumns).toContain('name');
    expect(component.displayedColumns).toContain('price');
  });

  it('should load companies on init', (done) => {
    setTimeout(() => {
      expect(component.companies.length).toBeGreaterThan(0);
      expect(component.isLoading).toBeFalse();
      done();
    }, 500);
  });

  it('should format market cap correctly', () => {
    expect(component.formatMarketCap(285000000000)).toContain('B');
    expect(component.formatMarketCap(1500000)).toContain('M');
    expect(component.formatMarketCap(500)).toBe('$500');
  });

  it('should format volume correctly', () => {
    expect(component.formatVolume(18500000)).toContain('M');
    expect(component.formatVolume(5600)).toContain('K');
    expect(component.formatVolume(500)).toBe('500');
  });
});
