import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'currencyFormat'
})
export class CurrencyFormatPipe implements PipeTransform {

  transform(value: number, format: string = 'standard', decimals: number = 2): string {
    if (value === null || value === undefined) {
      return '-';
    }

    if (format === 'compact') {
      return this.formatCompact(value);
    }

    if (format === 'millions') {
      return '$' + (value / 1000000).toFixed(decimals) + 'M';
    }

    if (format === 'billions') {
      return '$' + (value / 1000000000).toFixed(decimals) + 'B';
    }

    if (format === 'percent') {
      return value.toFixed(decimals) + '%';
    }

    if (format === 'shares') {
      return value.toLocaleString('en-US');
    }

    return '$' + value.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }

  private formatCompact(value: number): string {
    const absValue = Math.abs(value);
    const sign = value < 0 ? '-' : '';

    if (absValue >= 1000000000000) {
      return sign + '$' + (absValue / 1000000000000).toFixed(1) + 'T';
    }
    if (absValue >= 1000000000) {
      return sign + '$' + (absValue / 1000000000).toFixed(1) + 'B';
    }
    if (absValue >= 1000000) {
      return sign + '$' + (absValue / 1000000).toFixed(1) + 'M';
    }
    if (absValue >= 1000) {
      return sign + '$' + (absValue / 1000).toFixed(1) + 'K';
    }
    return sign + '$' + absValue.toFixed(2);
  }
}
