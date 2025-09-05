import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http'; // ✅ Import ajouté

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { LoginComponent } from './login/login.component';
import { AccueilComponent } from './pages/accueil/accueil.component';
import { CoreModule } from './core/core.module';
import { QAndAComponent } from './pages/q-and-a/q-and-a.component';
import { OffresEmploiComponent } from './pages/offres-emploi/offres-emploi.component';
import { StagesComponent } from './pages/stages/stages.component';
import { FormationComponent } from './pages/formation/formation.component';
import { OrientationComponent } from './pages/orientation/orientation.component';
import { SignupComponent } from './pages/signup/signup.component';

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    AccueilComponent,
    QAndAComponent,
    OffresEmploiComponent,
    StagesComponent,
    FormationComponent,
    OrientationComponent,
    SignupComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule, // ✅ Nécessaire pour HttpClient
    CoreModule ,
    HttpClientModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
