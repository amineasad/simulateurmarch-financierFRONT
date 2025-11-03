// src/app/app-routing.module.ts

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// Composants de trading
import { TradingRoomComponent } from './components/trading-room/trading-room.component';
import { OrdersComponent } from './components/orders/orders.component';
import { PortfolioComponent } from './components/portfolio/portfolio.component';

// Composants de jeu

import { LobbyComponent } from './components/gamingroom/lobby.component';
import { GamingRoomComponent } from './components/gamingroom/gaming-room.component';
// Composants d'authentification
import { LoginComponent } from './components/auth/login/login.component';
import { AccountOpeningIntroComponent } from './components/account-opening-intro/account-opening-intro.component';

// ❌ SUPPRIMEZ cette ligne
// import { RegisterComponent } from './components/auth/register/register.component';

// ✅ AJOUTEZ ces imports
import { LandingComponent } from './components/landing/landing.component';
import { SignupChoiceComponent } from './components/signup-choice/signup-choice.component';
import { SignupStudentComponent } from './components/signup-student/signup-student.component';
import { SignupCompanyComponent } from './components/signup-company/signup-company.component';
import { SignupIndividualComponent } from './components/signup-individual/signup-individual.component';

// Composants Wallet
import { WalletManagementComponent } from './components/wallet/wallet-management/wallet-management.component';
import { SuccessComponent } from './components/wallet/success/success.component';

// Guard (si vous en avez un)
// import { AuthGuard } from './guards/auth.guard';

const routes: Routes = [
  // ✅ Page d'accueil = Landing Page
  { path: '', component: LandingComponent },
  { path: 'open-account', component: AccountOpeningIntroComponent },
  
  // Authentification
  { path: 'login', component: LoginComponent },
  { path: 'register', redirectTo: '/signup-choice', pathMatch: 'full' },
  { path: 'signup', redirectTo: '/signup-choice', pathMatch: 'full' },
  { path: 'signup-choice', component: SignupChoiceComponent },
  { path: 'signup/student', component: SignupStudentComponent },
  { path: 'signup/company', component: SignupCompanyComponent },
  { path: 'signup/individual', component: SignupIndividualComponent },
  
  // Lobby et jeu
  
  
  { path: 'lobby', component: LobbyComponent },
  { path: 'gamingroom/:id', component: GamingRoomComponent},
  
  // Trading
  { path: 'trading', component: TradingRoomComponent },
  { path: 'orders', component: OrdersComponent },
  { path: 'portfolio', component: PortfolioComponent },
  
  // Wallet
  { path: 'wallet/manage', component: WalletManagementComponent },
  { path: 'wallet/success', component: SuccessComponent },
  { path: 'wallet/cancel', redirectTo: '/wallet/manage' },
  
  // ✅ Redirection par défaut vers Landing Page
  { path: '**', redirectTo: '', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }