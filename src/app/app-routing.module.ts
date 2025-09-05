import { SignupComponent } from './pages/signup/signup.component';
import { StagesComponent } from './pages/stages/stages.component';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { LoginComponent } from './login/login.component';
import { LayoutComponent } from './core/layout/layout.component';
import { AccueilComponent } from './pages/accueil/accueil.component';
import { QAndAComponent } from './pages/q-and-a/q-and-a.component';
import { OffresEmploiComponent } from './pages/offres-emploi/offres-emploi.component';
import { FormationComponent } from './pages/formation/formation.component';
import { OrientationComponent } from './pages/orientation/orientation.component';






const routes: Routes = [
  // Route publique sans layout
  { path: 'login', component: LoginComponent },
  
  { path: 'signup', component: SignupComponent },

  // Route protégée AVEC layout (sidebar + navbar)
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: 'accueil', component: AccueilComponent },
      { path: 'offres-emploi', component: OffresEmploiComponent },
      { path: 'stages', component: StagesComponent },
      { path: 'formation', component: FormationComponent },
      { path: 'orientation', component: OrientationComponent },
      { path: 'qanda', component: QAndAComponent },
      



      { path: '', redirectTo: 'accueil', pathMatch: 'full' }, // Redirection racine vers accueil
    ]
  },

  // Sécurité : toute URL inconnue redirige vers accueil
  { path: '**', redirectTo: '' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
