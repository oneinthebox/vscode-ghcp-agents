import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NumberFormatPipe } from '@fintech/shared-ui';
import { PortfolioService } from '@fintech/data-access';
import { SectorAllocation, GeographyAllocation } from '@fintech/shared-models';

@Component({
  selector: 'app-allocation',
  standalone: true,
  imports: [CommonModule, NumberFormatPipe],
  templateUrl: './allocation.component.html',
})
export class AllocationComponent implements OnInit {
  private readonly portfolioService = inject(PortfolioService);

  sectorAllocations: SectorAllocation[] = [];
  geoAllocations: GeographyAllocation[] = [];
  totalSectorMV = 0;
  totalGeoMV = 0;

  ngOnInit(): void {
    this.portfolioService.getSectorAllocations().subscribe((allocations) => {
      this.sectorAllocations = allocations;
      this.totalSectorMV = allocations.reduce((sum, a) => sum + a.marketValue, 0);
    });

    this.portfolioService.getGeographyAllocations().subscribe((allocations) => {
      this.geoAllocations = allocations;
      this.totalGeoMV = allocations.reduce((sum, a) => sum + a.marketValue, 0);
    });
  }

  getBarWidth(weight: number): string {
    return `${Math.min(weight * 100, 100)}%`;
  }

  getPnLClass(value: number): string {
    return value >= 0 ? 'text-success' : 'text-danger';
  }
}
