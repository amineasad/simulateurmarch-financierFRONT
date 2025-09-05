import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';          // ← ①  importe le RouterModule

import { LayoutComponent } from './layout/layout.component';
import { SidebarComponent } from './sidebar/sidebar.component';
import { NavbarComponent } from './navbar/navbar.component';

@NgModule({
  declarations: [
    LayoutComponent,
    SidebarComponent,
    NavbarComponent
  ],
  imports: [
    CommonModule,
    RouterModule                            // ← ②  ajoute‑le ici
  ],
  exports: [
    LayoutComponent,                        // ← ③  exporte ce dont tu as besoin
    SidebarComponent,
    NavbarComponent
  ]
})
export class CoreModule {}
