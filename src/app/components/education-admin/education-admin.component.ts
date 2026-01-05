import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { EducationService, EducationResource } from '../../services/education.service';
import { NgForm } from '@angular/forms';

type Niveau = 'EASY' | 'MID' | 'ADV';

@Component({
  selector: 'app-education-admin',
  templateUrl: './education-admin.component.html',
  styleUrls: ['./education-admin.component.css']
})
export class EducationAdminComponent implements OnInit {
  resources: EducationResource[] = [];
  editing: EducationResource | null = null;
  error: string | null = null;
  success: string | null = null;

  types = ['ARTICLE', 'VIDEO'];
  levels: Niveau[] = ['EASY', 'MID', 'ADV'];

  constructor(
    private ed: EducationService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  /** When true, we show the full-screen editor page (overlay). */
  get isEditingPage(): boolean { return !!this.editing; }

  ngOnInit(): void {
    this.load();

    // Optional: deep-link support (?new=1 / ?edit=ID)
    this.route.queryParams.subscribe(params => {
      const newMode = params['new'] === '1';
      const editId = params['edit'] ? +params['edit'] : null;

      if (newMode) {
        this.startCreate(false);
      } else if (editId) {
        const found = this.resources.find(r => r.id === editId);
        if (found) this.startEdit(found, false);
      } else {
        this.editing = null;
      }
    });
  }

  load() {
    this.ed.list().subscribe({
      next: r => {
        this.resources = (r ?? []).map(item => ({
          ...item,
          difficulty: (item as any).difficulty ?? 'MID'
        }));
      },
      error: () => this.error = 'Erreur lors du chargement'
    });
  }

  /* ===== list actions ===== */
  startCreate(navigate: boolean = true) {
    this.editing = {
      title: '', type: 'ARTICLE', content: '', url: '', description: '', difficulty: 'MID'
    } as EducationResource;

    if (navigate) this.router.navigate([], { queryParams: { new: 1 }, queryParamsHandling: 'merge' });
  }

  goEdit(r: EducationResource) { this.startEdit(r); }

  startEdit(r: EducationResource, navigate: boolean = true) {
    this.editing = { ...r, difficulty: (r as any).difficulty ?? 'MID' };
    if (navigate) this.router.navigate([], { queryParams: { edit: r.id }, queryParamsHandling: 'merge' });
  }

  backToList() {
    this.editing = null;
    // Clear query params so the “page” is list again
    this.router.navigate([], { queryParams: {}, replaceUrl: true });
  }

  /* ===== persistence ===== */
  save(form: NgForm) {
    if (!this.editing) return;
    if (!this.editing.difficulty) this.editing.difficulty = 'MID';

    const req$ = this.editing.id
      ? this.ed.update(this.editing.id, this.editing)
      : this.ed.create(this.editing);

    req$.subscribe({
      next: () => {
        this.success = this.editing?.id ? 'Modifié' : 'Ajouté';
        this.backToList();
        this.load();
      },
      error: () => {
        this.error = this.editing?.id ? 'Erreur lors de la modification' : 'Erreur lors de la création';
      }
    });
  }

  deleteResource(id?: number) {
    if (!id) return;
    if (!confirm('Supprimer cette ressource ?')) return;
    this.ed.delete(id).subscribe({
      next: () => { this.load(); this.success = 'Supprimé'; },
      error: () => this.error = 'Erreur lors de la suppression'
    });
  }

  /* ===== labels FR ===== */
  labelNiveau(v?: Niveau): string {
    switch (v) {
      case 'EASY': return 'Débutant';
      case 'ADV':  return 'Avancé';
      case 'MID':
      default:     return 'Intermédiaire';
    }
  }
  classeNiveau(v?: Niveau): 'debutant' | 'intermediaire' | 'avance' {
    switch (v) {
      case 'EASY': return 'debutant';
      case 'ADV':  return 'avance';
      case 'MID':
      default:     return 'intermediaire';
    }
  }
}
