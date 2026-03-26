// Example output from /angular-generate-service — see SKILL.md for usage
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { TradeExecutionService } from './trade-execution.service';
import { LoggingService } from '@core/services/logging.service';
import { ConfigService } from '@core/services/config.service';
import { TradeOrder } from '@shared/models/trade.model';

describe('TradeExecutionService', () => {
  let service: TradeExecutionService;
  let httpMock: HttpTestingController;
  let loggerSpy: jasmine.SpyObj<LoggingService>;
  let configSpy: jasmine.SpyObj<ConfigService>;

  const BASE_URL = 'https://api.test.example.com';

  beforeEach(() => {
    loggerSpy = jasmine.createSpyObj('LoggingService', ['info', 'error']);
    configSpy = jasmine.createSpyObj('ConfigService', ['getApiBaseUrl']);
    configSpy.getApiBaseUrl.and.returnValue(BASE_URL);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        TradeExecutionService,
        { provide: LoggingService, useValue: loggerSpy },
        { provide: ConfigService, useValue: configSpy },
      ],
    });

    service = TestBed.inject(TradeExecutionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  describe('submitOrder', () => {
    const order: TradeOrder = { symbol: 'AAPL', quantity: 100, side: 'BUY' };

    it('should POST the order and return confirmation', () => {
      const confirmation = { tradeId: 'T-001', status: 'FILLED', timestamp: Date.now() };

      service.submitOrder(order).subscribe((result) => {
        expect(result.tradeId).toBe('T-001');
        expect(result.status).toBe('FILLED');
      });

      const req = httpMock.expectOne(`${BASE_URL}/api/v1/trades`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(order);
      req.flush(confirmation);
    });

    it('should log before submitting', () => {
      service.submitOrder(order).subscribe();
      httpMock.expectOne(`${BASE_URL}/api/v1/trades`).flush({});
      expect(loggerSpy.info).toHaveBeenCalledWith('TradeExecutionService', jasmine.stringContaining('AAPL'));
    });

    it('should log and propagate errors', () => {
      service.submitOrder(order).subscribe({
        error: (err) => expect(err.status).toBe(422),
      });

      const req = httpMock.expectOne(`${BASE_URL}/api/v1/trades`);
      // Retry will fire once, so flush error twice
      req.flush('Rejected', { status: 422, statusText: 'Unprocessable Entity' });
      httpMock.expectOne(`${BASE_URL}/api/v1/trades`)
        .flush('Rejected', { status: 422, statusText: 'Unprocessable Entity' });

      expect(loggerSpy.error).toHaveBeenCalledWith('TradeExecutionService', jasmine.stringContaining('submitOrder'));
    });
  });

  describe('getTradeStatus', () => {
    it('should GET trade status by id', () => {
      service.getTradeStatus('T-001').subscribe((status) => {
        expect(status.state).toBe('PENDING');
      });

      const req = httpMock.expectOne(`${BASE_URL}/api/v1/trades/T-001/status`);
      expect(req.request.method).toBe('GET');
      req.flush({ state: 'PENDING', updatedAt: Date.now() });
    });
  });

  describe('cancelOrder', () => {
    it('should DELETE and log the cancellation', () => {
      service.cancelOrder('T-002').subscribe((result) => {
        expect(result.status).toBe('CANCELLED');
      });

      const req = httpMock.expectOne(`${BASE_URL}/api/v1/trades/T-002`);
      expect(req.request.method).toBe('DELETE');
      req.flush({ tradeId: 'T-002', status: 'CANCELLED', timestamp: Date.now() });

      expect(loggerSpy.info).toHaveBeenCalledWith('TradeExecutionService', jasmine.stringContaining('T-002'));
    });
  });
});
