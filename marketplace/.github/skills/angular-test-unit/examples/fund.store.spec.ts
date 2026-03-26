// Example output from /angular-test-unit — see SKILL.md for usage
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';

import { FundStore } from './fund.store';
import { LoggingService } from '@core/services/logging.service';
import { Fund } from '@shared/models/fund.model';

describe('FundStore', () => {
  let store: InstanceType<typeof FundStore>;
  let httpMock: HttpTestingController;
  let loggerSpy: jasmine.SpyObj<LoggingService>;

  const MOCK_FUNDS: Fund[] = [
    { id: 1, ticker: 'VTI', name: 'Vanguard Total Stock', category: 'Equity', aum: 350000, ytdReturn: 0.12 },
    { id: 2, ticker: 'BND', name: 'Vanguard Total Bond', category: 'Fixed Income', aum: 120000, ytdReturn: 0.03 },
  ];

  beforeEach(() => {
    loggerSpy = jasmine.createSpyObj('LoggingService', ['info', 'error']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        FundStore,
        { provide: LoggingService, useValue: loggerSpy },
      ],
    });

    store = TestBed.inject(FundStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  describe('initial state', () => {
    it('should start with empty funds and loading false', () => {
      expect(store.funds()).toEqual([]);
      expect(store.loading()).toBe(false);
      expect(store.error()).toBeNull();
    });
  });

  describe('loadFunds', () => {
    it('should set loading to true while fetching', () => {
      store.loadFunds('Equity');
      expect(store.loading()).toBe(true);

      httpMock.expectOne('/api/v1/funds?category=Equity').flush(MOCK_FUNDS);
      expect(store.loading()).toBe(false);
    });

    it('should populate funds on success', () => {
      store.loadFunds('Equity');
      httpMock.expectOne('/api/v1/funds?category=Equity').flush(MOCK_FUNDS);

      expect(store.funds().length).toBe(2);
      expect(store.funds()[0].ticker).toBe('VTI');
    });

    it('should set error on failure', () => {
      store.loadFunds('Equity');
      httpMock
        .expectOne('/api/v1/funds?category=Equity')
        .flush('Server Error', { status: 500, statusText: 'Internal Server Error' });

      expect(store.error()).toBeTruthy();
      expect(store.funds()).toEqual([]);
      expect(loggerSpy.error).toHaveBeenCalledWith('FundStore', jasmine.stringContaining('500'));
    });
  });

  describe('computed: totalAum', () => {
    it('should sum AUM across all loaded funds', () => {
      store.loadFunds('Equity');
      httpMock.expectOne('/api/v1/funds?category=Equity').flush(MOCK_FUNDS);

      expect(store.totalAum()).toBe(470000);
    });

    it('should return 0 when no funds are loaded', () => {
      expect(store.totalAum()).toBe(0);
    });
  });

  describe('computed: topPerformer', () => {
    it('should return the fund with the highest YTD return', () => {
      store.loadFunds('Equity');
      httpMock.expectOne('/api/v1/funds?category=Equity').flush(MOCK_FUNDS);

      expect(store.topPerformer()?.ticker).toBe('VTI');
    });

    it('should return undefined when no funds are loaded', () => {
      expect(store.topPerformer()).toBeUndefined();
    });
  });
});
