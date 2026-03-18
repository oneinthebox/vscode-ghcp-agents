import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { ResearchService } from '../../services/research.service';
import { Company } from '../../models/company.model';

@Component({
  selector: 'app-company-search',
  templateUrl: './company-search.component.html',
  styleUrls: []
})
export class CompanySearchComponent implements OnInit {

  searchQuery = '';
  isLoading = false;
  companies: Company[] = [];
  dataSource = new MatTableDataSource<Company>();
  selectedSector = '';

  displayedColumns = [
    'ticker', 'name', 'sector', 'price', 'change', 'changePercent',
    'marketCap', 'peRatio', 'volume', 'dividend'
  ];

  sectors = [
    'Technology', 'Financials', 'Healthcare', 'Energy',
    'Industrials', 'Consumer Staples', 'Real Estate'
  ];

  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private researchService: ResearchService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadAllCompanies();
  }

  loadAllCompanies(): void {
    this.isLoading = true;
    this.researchService.getAllCompanies().subscribe(companies => {
      this.companies = companies;
      this.dataSource.data = companies;
      this.dataSource.sort = this.sort;
      this.isLoading = false;
      console.log('Loaded', companies.length, 'companies');
    });
  }

  onSearch(): void {
    if (!this.searchQuery.trim()) {
      this.loadAllCompanies();
      return;
    }

    this.isLoading = true;
    this.researchService.searchCompanies(this.searchQuery).subscribe(result => {
      this.companies = result.companies;
      this.dataSource.data = result.companies;
      this.isLoading = false;
      console.log('Search returned', result.totalResults, 'results');
    });
  }

  onSectorFilter(): void {
    if (!this.selectedSector) {
      this.loadAllCompanies();
      return;
    }

    this.isLoading = true;
    this.researchService.getCompaniesBySector(this.selectedSector).subscribe(companies => {
      this.companies = companies;
      this.dataSource.data = companies;
      this.isLoading = false;
    });
  }

  viewCompany(company: Company): void {
    this.router.navigate(['/research/company', company.id]);
  }

  formatMarketCap(value: number): string {
    if (value >= 1e12) return '$' + (value / 1e12).toFixed(1) + 'T';
    if (value >= 1e9) return '$' + (value / 1e9).toFixed(1) + 'B';
    if (value >= 1e6) return '$' + (value / 1e6).toFixed(1) + 'M';
    return '$' + value.toFixed(0);
  }

  formatVolume(value: number): string {
    if (value >= 1e6) return (value / 1e6).toFixed(1) + 'M';
    if (value >= 1e3) return (value / 1e3).toFixed(1) + 'K';
    return value.toString();
  }
}
