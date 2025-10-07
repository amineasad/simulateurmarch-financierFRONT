import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TradingRoomComponent } from './components/trading-room/trading-room.component';
import { GameLobbyComponent } from './components/game-lobby/game-lobby.component';
import { GameRoomComponent } from './components/game-room/game-room.component';
import { LoginComponent } from './components/auth/login/login.component';
import { RegisterComponent } from './components/auth/register/register.component';
import { WalletManagementComponent } from './components/wallet/wallet-management/wallet-management.component';
import { SuccessComponent } from './components/wallet/success/success.component';
import { OrdersComponent } from './components/orders/orders.component';
import { PortfolioComponent } from './components/portfolio/portfolio.component';
const routes: Routes = [
  { path: '', redirectTo: '/lobby', pathMatch: 'full' },
  { path: 'lobby', component: GameLobbyComponent },
  { path: 'trading', component: TradingRoomComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'wallet/manage', component: WalletManagementComponent },
  { path: 'wallet/manage', component: WalletManagementComponent },
  { path: 'wallet/success', component: SuccessComponent },
  { path: 'wallet/cancel', redirectTo: '/wallet/manage' },
  { path: 'orders', component: OrdersComponent },
  { path: 'portfolio', component: PortfolioComponent },
  { path: 'game-room/:id', component: GameRoomComponent }, // ← Salle de jeu
  { path: '**', redirectTo: '/lobby' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }