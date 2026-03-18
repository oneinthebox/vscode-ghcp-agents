import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'numberFormat',
  standalone: true,
})
export class NumberFormatPipe implements PipeTransform {
  transform(value: number | string | null | undefined, format: string = 'number'): string {
    if (value === null || value === undefined || value === '') return '--';

    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '--';

    switch (format) {
      case 'currency':
        return this.formatCurrency(num);
      case 'percent':
        return this.formatPercent(num);
      case 'compact':
        return this.formatCompact(num);
      case 'number':
      default:
        return this.formatNumber(num);
    }
  }

  private formatCurrency(value: number): string {
    const abs = Math.abs(value);
    const sign = value < 0 ? '-' : '';
    if (abs >= 1e9) {
      return `${sign}$${(abs / 1e9).toFixed(2)}B`;
    } else if (abs >= 1e6) {
      return `${sign}$${(abs / 1e6).toFixed(2)}M`;
    } else if (abs >= 1e3) {
      return `${sign}$${abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `${sign}$${abs.toFixed(2)}`;
  }

  private formatPercent(value: number): string {
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  }

  private formatCompact(value: number): string {
    const abs = Math.abs(value);
    const sign = value < 0 ? '-' : '';
    if (abs >= 1e12) return `${sign}${(abs / 1e12).toFixed(1)}T`;
    if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(1)}B`;
    if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(1)}M`;
    if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(1)}K`;
    return `${sign}${abs.toFixed(0)}`;
  }

  private formatNumber(value: number): string {
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
}
