import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { BotService } from '../../../services/bot.service';
import { Bot, BotStatus } from '../../../models/bot.model';

@Component({
  selector: 'app-bot-dashboard',
  templateUrl: './bot-dashboard.component.html',
  styleUrls: ['./bot-dashboard.component.css']
})
export class BotDashboardComponent implements OnInit {
  bots: Bot[] = [];
  loading = false;
  
  // Stats
  totalBots = 0;
  activeBots = 0;
  totalInvestment = 0;

  constructor(private botService: BotService, private router: Router) { }

  ngOnInit(): void {
    this.loadBots();
  }

  loadBots(): void {
    this.loading = true;
    // TODO: Get actual logged in user ID
    const userId = 1;
    this.botService.getUserBots(userId).subscribe(
      (data) => {
        this.bots = data;
        this.calculateStats();
        this.loading = false;
      },
      (error) => {
        console.error('Error loading bots', error);
        this.loading = false;
      }
    );
  }

  calculateStats(): void {
    this.totalBots = this.bots.length;
    this.activeBots = this.bots.filter(b => b.status === BotStatus.ACTIVE).length;
    this.totalInvestment = this.bots.reduce((sum, b) => sum + (b.investmentAmount || 0), 0);
  }

  toggleStatus(bot: Bot): void {
    if (!bot.id) return;
    
    const newStatus = bot.status === BotStatus.ACTIVE ? BotStatus.PAUSED : BotStatus.ACTIVE;
    this.botService.updateBotStatus(bot.id, newStatus).subscribe(
      (updatedBot) => {
        bot.status = updatedBot.status;
        this.calculateStats();
      }
    );
  }

  editBot(bot: Bot): void {
    this.router.navigate(['/bots/edit', bot.id]);
  }

  deleteBot(bot: Bot): void {
    if (!bot.id || !confirm('Are you sure you want to delete this bot?')) return;
    
    this.botService.deleteBot(bot.id).subscribe(() => {
      this.bots = this.bots.filter(b => b.id !== bot.id);
      this.calculateStats();
    });
  }

  createBot(): void {
    this.router.navigate(['/bots/create']);
  }
  
  browseMarketplace(): void {
    this.router.navigate(['/bots/marketplace']);
  }
}
