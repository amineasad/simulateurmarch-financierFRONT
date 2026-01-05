import { Component, OnInit } from '@angular/core';
import { BotService } from '../../../services/bot.service';
import { BotTemplate, StrategyType } from '../../../models/bot.model';
import { Router } from '@angular/router';

@Component({
  selector: 'app-bot-marketplace',
  templateUrl: './bot-marketplace.component.html',
  styleUrls: ['./bot-marketplace.component.css']
})
export class BotMarketplaceComponent implements OnInit {
  templates: BotTemplate[] = [];
  filteredTemplates: BotTemplate[] = [];
  selectedStrategy: string = 'ALL';
  strategies = Object.values(StrategyType);

  constructor(private botService: BotService, private router: Router) { }

  ngOnInit(): void {
    this.loadTemplates();
  }

  loadTemplates(): void {
    this.botService.getAllTemplates().subscribe(
      (data) => {
        this.templates = data;
        this.filteredTemplates = data;
      },
      (error) => {
        console.error('Error loading templates', error);
      }
    );
  }

  filterByStrategy(strategy: string): void {
    this.selectedStrategy = strategy;
    if (strategy === 'ALL') {
      this.filteredTemplates = this.templates;
    } else {
      this.filteredTemplates = this.templates.filter(t => t.strategyType === strategy);
    }
  }

  useTemplate(template: BotTemplate): void {
    // Navigate to bot builder with template ID
    this.router.navigate(['/bots/create'], { queryParams: { templateId: template.id } });
  }
}
