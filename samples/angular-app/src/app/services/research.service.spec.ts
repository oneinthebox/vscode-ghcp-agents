import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ResearchService } from './research.service';

describe('ResearchService', () => {
  let service: ResearchService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ResearchService]
    });
    service = TestBed.inject(ResearchService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return all companies', (done) => {
    service.getAllCompanies().subscribe(companies => {
      expect(companies.length).toBeGreaterThan(0);
      expect(companies[0].ticker).toBeDefined();
      expect(companies[0].name).toBeDefined();
      done();
    });
  });

  it('should search companies by ticker', (done) => {
    service.searchCompanies('APEX').subscribe(result => {
      expect(result.companies.length).toBe(1);
      expect(result.companies[0].ticker).toBe('APEX');
      done();
    });
  });

  it('should search companies by sector', (done) => {
    service.searchCompanies('Technology').subscribe(result => {
      expect(result.companies.length).toBeGreaterThan(0);
      result.companies.forEach(c => {
        expect(c.sector).toBe('Technology');
      });
      done();
    });
  });

  it('should return company by ID', (done) => {
    service.getCompanyById('APEX001').subscribe(company => {
      expect(company).toBeDefined();
      expect(company?.ticker).toBe('APEX');
      expect(company?.name).toContain('Apex');
      done();
    });
  });

  it('should return undefined for unknown company ID', (done) => {
    service.getCompanyById('UNKNOWN').subscribe(company => {
      expect(company).toBeUndefined();
      done();
    });
  });

  it('should return financials for a company', (done) => {
    service.getCompanyFinancials('APEX001').subscribe(financials => {
      expect(financials).toBeDefined();
      expect(financials.revenue.length).toBe(4);
      expect(financials.netIncome.length).toBe(4);
      expect(financials.debtToEquity).toBeGreaterThan(0);
      done();
    });
  });
});
