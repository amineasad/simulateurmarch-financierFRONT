// src/app/components/ia-predictions/ia-predictions.component.ts
import { Component, OnInit } from '@angular/core';
import { PredictionService } from '../../services/prediction.service';

interface AssetPrediction {
  ticker: string;
  predictions?: number[];
  dates?: string[];
  error?: string;
}

interface PredictionResponse {
  update_date: string;
  future_dates: string[];
  predictions: AssetPrediction[];
}

@Component({
  selector: 'app-ia-predictions',
  templateUrl: './ia-predictions.component.html',
  styleUrls: ['./ia-predictions.component.css']
})
export class IaPredictionsComponent implements OnInit {

  data: PredictionResponse | null = null;
  isLoading = false;
  errorMessage: string | null = null;

  constructor(private predictionService: PredictionService) {}

  ngOnInit(): void {
    this.loadPredictions();
  }

  loadPredictions(): void {
    this.isLoading = true;
    this.errorMessage = null;

    this.predictionService.getPredictions().subscribe({
      next: (res) => {
        this.data = res;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erreur prédictions IA :', err);
        this.errorMessage = 'Impossible de récupérer les prédictions. Vérifie que le service Flask tourne bien.';
        this.isLoading = false;
      }
    });
  }

  hasError(pred: AssetPrediction): boolean {
    return !!pred.error;
  }
}
