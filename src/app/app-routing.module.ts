import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TradingRoomComponent } from './components/trading-room/trading-room.component';
import { GameLobbyComponent } from './components/game-lobby/game-lobby.component';
import { GameRoomComponent } from './components/game-room/game-room.component';

const routes: Routes = [
  { path: '', redirectTo: '/lobby', pathMatch: 'full' },
  { path: 'lobby', component: GameLobbyComponent },
  { path: 'trading', component: TradingRoomComponent },
  { path: 'game-room/:id', component: GameRoomComponent }, // ← Salle de jeu
  { path: '**', redirectTo: '/lobby' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }