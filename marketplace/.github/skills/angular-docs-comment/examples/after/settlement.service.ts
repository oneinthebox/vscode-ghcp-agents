import { inject, Injectable } from '@angular/core';
import { HolidayCalendarService } from './holiday-calendar.service';

@Injectable({ providedIn: 'root' })
export class SettlementService {
  private readonly holidays = inject(HolidayCalendarService);

  calculateSettlementDate(tradeDate: Date, instrumentType: 'equity' | 'bond' | 'option'): Date {
    // SEC Rule 15c6-1 defines settlement cycles: T+2 for equities, T+1 for bonds and options.
    // Bonds moved to T+1 in May 2024; options have always been T+1.
    const cycleDays = instrumentType === 'bond' ? 1 : instrumentType === 'option' ? 1 : 2;
    let settlementDate = new Date(tradeDate);
    let businessDaysAdded = 0;

    // Walk forward one calendar day at a time, only counting business days.
    // Weekends and exchange holidays are skipped because clearinghouses
    // (DTCC/NSCC) do not process settlements on those days.
    while (businessDaysAdded < cycleDays) {
      settlementDate.setDate(settlementDate.getDate() + 1);
      const dayOfWeek = settlementDate.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;
      if (this.holidays.isHoliday(settlementDate)) continue;
      businessDaysAdded++;
    }

    // Bonds settle through Fedwire, which closes on Federal Reserve holidays.
    // If the computed date lands on a Fed holiday we must push to the next
    // valid business day to avoid a failed wire transfer.
    if (instrumentType === 'bond' && this.isFederalReserveHoliday(settlementDate)) {
      settlementDate.setDate(settlementDate.getDate() + 1);
      // Keep advancing past any weekend or holiday cluster that follows the Fed holiday.
      while (settlementDate.getDay() === 0 || settlementDate.getDay() === 6 || this.holidays.isHoliday(settlementDate)) {
        settlementDate.setDate(settlementDate.getDate() + 1);
      }
    }

    return settlementDate;
  }

  private isFederalReserveHoliday(date: Date): boolean {
    // Separate from exchange holidays — Fed holidays include days like
    // Columbus Day that the NYSE remains open for.
    const fedHolidays = this.holidays.getFederalReserveHolidays(date.getFullYear());
    return fedHolidays.some(h => h.getTime() === date.getTime());
  }
}
