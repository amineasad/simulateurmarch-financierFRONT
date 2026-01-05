import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { BotService } from '../../../services/bot.service';
import { Bot, StrategyType, BotStatus } from '../../../models/bot.model';

@Component({
  selector: 'app-bot-builder',
  templateUrl: './bot-builder.component.html',
  styleUrls: ['./bot-builder.component.css']
})
export class BotBuilderComponent implements OnInit {
  botForm: FormGroup;
  strategies = Object.values(StrategyType);
  isEditMode = false;
  botId: number | null = null;
  loading = false;

  constructor(
    private fb: FormBuilder,
    private botService: BotService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.botForm = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      strategyType: [StrategyType.CUSTOM, Validators.required],
      investmentAmount: [1000, [Validators.required, Validators.min(10)]],
      tradingPair: ['EUR/USD', Validators.required],
      maxPositionSize: [100, [Validators.required, Validators.min(1)]],
      stopLossPercentage: [2.0, [Validators.required, Validators.min(0.1)]],
      takeProfitPercentage: [5.0, [Validators.required, Validators.min(0.1)]],
      configuration: ['{}'] // JSON string for advanced config
    });
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['templateId']) {
        this.loadTemplate(params['templateId']);
      }
    });

    this.route.params.subscribe(params => {
      if (params['id']) {
        this.isEditMode = true;
        this.botId = +params['id'];
        this.loadBot(this.botId);
      }
    });
  }

  loadTemplate(templateId: number): void {
    this.botService.getAllTemplates().subscribe(templates => {
      const template = templates.find(t => t.id == templateId);
      if (template) {
        this.botForm.patchValue({
          name: `Copy of ${template.name}`,
          description: template.description,
          strategyType: template.strategyType,
          configuration: template.defaultConfiguration
        });
      }
    });
  }

  loadBot(id: number): void {
    this.loading = true;
    this.botService.getBot(id).subscribe(bot => {
      this.botForm.patchValue(bot);
      this.loading = false;
    });
  }

  onSubmit(): void {
    if (this.botForm.invalid) return;

    const botData: Bot = {
      ...this.botForm.value,
      userId: 1, // TODO: Get actual logged in user ID
      status: BotStatus.STOPPED
    };

    if (this.isEditMode && this.botId) {
      this.botService.updateBot(this.botId, botData).subscribe(() => {
        this.router.navigate(['/bots/dashboard']);
      });
    } else {
      this.botService.createBot(botData).subscribe(() => {
        this.router.navigate(['/bots/dashboard']);
      });
    }
  }

  onCancel(): void {
    this.router.navigate(['/bots/dashboard']);
  }
}
