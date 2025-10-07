import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { TradingRoomComponent } from './components/trading-room/trading-room.component';
import { PriceChartComponent } from './components/price-chart/price-chart.component';
import { GameLobbyComponent } from './components/game-lobby/game-lobby.component';
import { GameRoomComponent } from './components/game-room/game-room.component'; // ← Ajout

// Services
import { WebsocketService } from './services/websocket.service';
import { TradingService } from './services/trading.service';
import { GameService } from './services/game.service';
import { LoginComponent } from './components/auth/login/login.component';
import { RegisterComponent } from './components/auth/register/register.component';
import { WalletManagementComponent } from './components/wallet/wallet-management/wallet-management.component';
import { SuccessComponent } from './components/wallet/success/success.component';
import { OrdersComponent } from './components/orders/orders.component';
import { PortfolioComponent } from './components/portfolio/portfolio.component';

@NgModule({
  declarations: [
    AppComponent,
    TradingRoomComponent,
    PriceChartComponent,
    GameLobbyComponent,
    GameRoomComponent,
    LoginComponent,
    RegisterComponent,
    WalletManagementComponent,
    SuccessComponent,
    OrdersComponent,
    PortfolioComponent // ← Ajout
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule,
    CommonModule
  ],
  providers: [
    WebsocketService,
    TradingService,
    GameService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }