

import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { TradingRoomComponent } from './components/trading-room/trading-room.component';
import { PriceChartComponent } from './components/price-chart/price-chart.component';


import { LobbyComponent } from './components/gamingroom/lobby.component';
import { GamingRoomComponent } from './components/gamingroom/gaming-room.component';

// Services
import { WebsocketService } from './services/websocket.service';
import { TradingService } from './services/trading.service';

import { LoginComponent } from './components/auth/login/login.component';
import { WalletManagementComponent } from './components/wallet/wallet-management/wallet-management.component';
import { SuccessComponent } from './components/wallet/success/success.component';
import { OrdersComponent } from './components/orders/orders.component';
import { PortfolioComponent } from './components/portfolio/portfolio.component';
import { LandingComponent } from './components/landing/landing.component';
import { SignupChoiceComponent } from './components/signup-choice/signup-choice.component';
import { SignupStudentComponent } from './components/signup-student/signup-student.component';
import { SignupIndividualComponent } from './components/signup-individual/signup-individual.component';
import { SignupCompanyComponent } from './components/signup-company/signup-company.component';
import { AccountOpeningIntroComponent } from './components/account-opening-intro/account-opening-intro.component';
import { AssetDetailComponent } from './components/asset-detail/asset-detail.component';
import { NewsMarketComponent } from './components/news-market/news-market.component';
import { PriceDisplayComponent } from './components/price-display/price-display.component';
import { EducationComponent } from './components/education/education.component';
import { EducationAdminComponent } from './components/education-admin/education-admin.component';
import { ForumComponent } from './components/forum/forum.component';
import { ReclamationComponent } from './components/reclamation/reclamation.component';
import { ReclamationChatComponent } from './components/reclamation-chat/reclamation-chat.component';
import { SafeUrlPipe } from './pipes/safe-url.pipe'; 
//salledejeu
import { SessionOrderBookComponent } from './components/session-order-book/session-order-book.component';
import { VirtualClockComponent } from './components/virtual-clock/virtual-clock.component';
//iaprediction
import { IaPredictionsComponent } from './components/ia-predictions/ia-predictions.component';

// Bots
import { BotDashboardComponent } from './components/bots/bot-dashboard/bot-dashboard.component';
import { BotMarketplaceComponent } from './components/bots/bot-marketplace/bot-marketplace.component';
import { BotBuilderComponent } from './components/bots/bot-builder/bot-builder.component';
import { ReactiveFormsModule } from '@angular/forms';

@NgModule({
  declarations: [
    AppComponent,
    TradingRoomComponent,
    PriceChartComponent,
   
    
    LoginComponent,
LobbyComponent,
GamingRoomComponent,
    WalletManagementComponent,
    SuccessComponent,
    OrdersComponent,
    PortfolioComponent,
    LandingComponent,
    SignupChoiceComponent,
    SignupStudentComponent,
    SignupIndividualComponent,
    SignupCompanyComponent,
    AccountOpeningIntroComponent,
    AssetDetailComponent,
    PriceDisplayComponent,
    EducationComponent,
    EducationAdminComponent,
    ForumComponent,
    ReclamationComponent,
    ReclamationChatComponent,
    NewsMarketComponent,
     SafeUrlPipe,
     //salledejeu
     SessionOrderBookComponent,
     VirtualClockComponent,
     //iaprediction
     IaPredictionsComponent,
     //bots
      
    BotDashboardComponent,
    BotMarketplaceComponent,
    BotBuilderComponent,
    
    
    // ← Ajout
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    CommonModule
  ],
  providers: [
    WebsocketService,
    TradingService,
    
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }