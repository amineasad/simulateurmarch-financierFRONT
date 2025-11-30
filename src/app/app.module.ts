// src/app/app.module.ts → VERSION FINALE QUI SUPPRIME TOUTES LES ERREURS
import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { NewlineToBrPipe } from './pipes/newline-to-br.pipe';
import { AppComponent } from './app.component';

@NgModule({
  declarations: [
    AppComponent,
    NewlineToBrPipe
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    FormsModule
     
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }