import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NumberFormatPipe } from '../../pipes/number-format.pipe';

@Component({
  selector: 'fintech-data-card',
  standalone: true,
  imports: [CommonModule, NumberFormatPipe],
  templateUrl: './data-card.component.html',
})
export class DataCardComponent {
  @Input() label = '';
  @Input() value: number | string = 0;
  @Input() format: 'currency' | 'percent' | 'number' | 'compact' = 'number';
  @Input() changeValue?: number;
  @Input() changePercent?: number;
  @Input() prefix = '';
  @Input() suffix = '';
  @Input() accentColor = '#00d4aa';

  get isPositive(): boolean {
    if (this.changeValue !== undefined) return this.changeValue >= 0;
    if (typeof this.value === 'number') return this.value >= 0;
    return true;
  }

  get changeClass(): string {
    if (this.changeValue === undefined) return '';
    return this.changeValue >= 0 ? 'text-success' : 'text-danger';
  }

  get changeArrow(): string {
    if (this.changeValue === undefined) return '';
    return this.changeValue >= 0 ? '\u25B2' : '\u25BC';
  }
}
