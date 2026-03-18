import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ResearchService } from '../../services/research.service';
import { FundService } from '../../services/fund.service';
import { Company, CompanyFinancials } from '../../models/company.model';
import { Holding } from '../../models/fund.model';

@Component({
  selector: 'app-company-detail',
  templateUrl: './company-detail.component.html',
  styleUrls: []
})
export class CompanyDetailComponent implements OnInit, OnDestroy {

  company: Company | undefined;
  financials: CompanyFinancials | undefined;
  relatedHoldings: Holding[] = [];
  isLoading = true;
  activeTab = 0;
  private subscriptions: Subscription[] = [];

  financialColumns = ['quarter', 'revenue', 'netIncome', 'margin'];
  holdingColumns = ['fundId', 'shares', 'avgCost', 'marketValue', 'weight', 'pnl'];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private researchService: ResearchService,
    private fundService: FundService
  ) { }

  ngOnInit(): void {
    const sub = this.route.params.subscribe(params => {
      const companyId = params['id'];
      this.loadCompanyData(companyId);
    });
    this.subscriptions.push(sub);
  }

  loadCompanyData(companyId: string): void {
    this.isLoading = true;

    // Nested subscribe anti-pattern
    this.researchService.getCompanyById(companyId).subscribe(company => {
      this.company = company;
      console.log('Company loaded:', company?.name);

      if (company) {
        this.researchService.getCompanyFinancials(companyId).subscribe(financials => {
          this.financials = financials;
          console.log('Financials loaded for:', company.name);

          this.fundService.getAllHoldings().subscribe(holdings => {
            this.relatedHoldings = holdings.filter(h => h.ticker === company.ticker);
            this.isLoading = false;
            console.log('Found', this.relatedHoldings.length, 'holdings for', company.ticker);
          });
        });
      } else {
        this.isLoading = false;
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/research']);
  }

  formatLargeNumber(value: number): string {
    if (value >= 1e12) return '$' + (value / 1e12).toFixed(2) + 'T';
    if (value >= 1e9) return '$' + (value / 1e9).toFixed(2) + 'B';
    if (value >= 1e6) return '$' + (value / 1e6).toFixed(2) + 'M';
    return '$' + value.toLocaleString();
  }

  getChangeClass(value: number): string {
    return value >= 0 ? 'positive' : 'negative';
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
}
