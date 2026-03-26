import { inject, Injectable } from '@angular/core';
import { HolidayCalendarService } from './holiday-calendar.service';

@Injectable({ providedIn: 'root' })
export class SettlementService {
  private readonly holidays = inject(HolidayCalendarService);

  calculateSettlementDate(tradeDate: Date, instrumentType: 'equity' | 'bond' | 'option'): Date {
    const cycleDays = instrumentType === 'bond' ? 1 : instrumentType === 'option' ? 1 : 2;
    let settlementDate = new Date(tradeDate);
    let businessDaysAdded = 0;

    while (businessDaysAdded < cycleDays) {
      settlementDate.setDate(settlementDate.getDate() + 1);
      const dayOfWeek = settlementDate.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;
      if (this.holidays.isHoliday(settlementDate)) continue;
      businessDaysAdded++;
    }

    if (instrumentType === 'bond' && this.isFederalReserveHoliday(settlementDate)) {
      settlementDate.setDate(settlementDate.getDate() + 1);
      while (settlementDate.getDay() === 0 || settlementDate.getDay() === 6 || this.holidays.isHoliday(settlementDate)) {
        settlementDate.setDate(settlementDate.getDate() + 1);
      }
    }

    return settlementDate;
  }

  private isFederalReserveHoliday(date: Date): boolean {
    const fedHolidays = this.holidays.getFederalReserveHolidays(date.getFullYear());
    return fedHolidays.some(h => h.getTime() === date.getTime());
  }
}
