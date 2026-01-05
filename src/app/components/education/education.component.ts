import { Component, HostListener, OnInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { EducationService, EducationResource } from '../../services/education.service';

type SortMode = 'OLDEST' | 'ALPHA';
type Difficulty = 'EASY' | 'MID' | 'ADV';

interface EduProgress {
  completed: boolean;
  favorite?: boolean;
  lastOpenedAt?: number;
}

@Component({
  selector: 'app-education',
  templateUrl: './education.component.html',
  styleUrls: ['./education.component.css']
})
export class EducationComponent implements OnInit {
  resources: EducationResource[] = [];

  // Level-sliced content
  private levelArticles: EducationResource[] = [];
  private levelVideos: EducationResource[] = [];

  // Current visible pair index (0-based)
  currentStep = 0;

  loading = true;
  error: string | null = null;

  sortMode: SortMode = 'OLDEST';
  query = '';

  difficulty: Difficulty = 'EASY'; // default

  // Inline player state
  playingId: string | null = null;

  // Article overlay state
  active: EducationResource | null = null;
  dockOpen = false;

  progress: Record<string, EduProgress | undefined> = {};
  private KEY = 'eduProgress';

  // difficulty ordering helpers
  private order: Difficulty[] = ['EASY', 'MID', 'ADV'];

  constructor(private ed: EducationService, private sanitizer: DomSanitizer) {}

  ngOnInit(): void {
    this.loadProgress();
    this.loadResources();
  }

  /* ---------- Shortcuts ---------- */
  @HostListener('document:keydown', ['$event'])
  handleKeys(e: KeyboardEvent) {
    if (e.key.toLowerCase() === 'n' || e.key === 'ArrowRight') {
      if (this.canGoNext()) this.nextStep();
    } else if (e.key === 'ArrowLeft') {
      if (this.canGoPrev()) this.prevStep();
    } else if (e.key.toLowerCase() === 'f') {
      const current = this.playingId
        ? this.levelVideos.find(r => this.keyOf(r) === this.playingId)
        : this.active;
      if (current) this.toggleFavorite(current);
    } else if (e.key === 'Escape') {
      this.closeDock();
      this.playingId = null;
    }
  }

  // Scroll to navigate — ignore inside scrollable article/dock
  onWheel(ev: WheelEvent) {
    const target = ev.target as Element | null;
    if (target && (target.closest('.article-preview') || target.closest('.dock-article'))) return;
    if (Math.abs(ev.deltaY) < 30) return;
    if (ev.deltaY > 0 && this.canGoNext()) this.nextStep();
    else if (ev.deltaY < 0 && this.canGoPrev()) this.prevStep();
  }

  /* ---------- Computed ---------- */
  get completionPercent(): number {
    if (!this.resources.length) return 0;
    const done = this.resources.filter(r => (this.progress[this.keyOf(r)]?.completed)).length;
    return Math.round((done / this.resources.length) * 100);
  }

  get maxSteps(): number {
    return Math.max(this.levelVideos.length, this.levelArticles.length);
  }

  get currentVideo(): EducationResource | null {
    return this.levelVideos[this.currentStep] ?? null;
  }

  get currentArticle(): EducationResource | null {
    return this.levelArticles[this.currentStep] ?? null;
  }

  private bothDoneForStep(step: number): boolean {
    const v = this.levelVideos[step];
    const a = this.levelArticles[step];
    const vDone = v ? !!this.progress[this.keyOf(v)]?.completed : true;
    const aDone = a ? !!this.progress[this.keyOf(a)]?.completed : true;
    return vDone && aDone;
  }

  /* ---------- NEXT/PREV availability including cross-level ---------- */
  private hasNextStepInLevel(): boolean {
    return this.currentStep < (this.maxSteps - 1);
  }
  private nextDifficulty(): Difficulty | null {
    const idx = this.order.indexOf(this.difficulty);
    return idx >= 0 && idx < this.order.length - 1 ? this.order[idx + 1] : null;
  }
  private prevDifficulty(): Difficulty | null {
    const idx = this.order.indexOf(this.difficulty);
    return idx > 0 ? this.order[idx - 1] : null;
  }
  private hasContentFor(level: Difficulty): boolean {
    return this.resources.some(r => (r as any).difficulty === level);
  }
  private isLevelFullyDone(level: Difficulty): boolean {
    const items = this.resources.filter(r => (r as any).difficulty === level);
    if (items.length === 0) return false;
    return items.every(r => !!this.progress[this.keyOf(r)]?.completed);
  }

  /** Suivant activé UNIQUEMENT si l'article ET la vidéo sont marqués fait. */
  canGoNext(): boolean {
    if (this.maxSteps === 0) return false;
    const pairDone = this.bothDoneForStep(this.currentStep);
    if (!pairDone) return false;

    if (this.hasNextStepInLevel()) return true;

    const next = this.nextDifficulty();
    if (!next) return false;
    const unlocked = this.isLevelUnlocked(next);
    const hasContent = this.hasContentFor(next);
    return unlocked && hasContent;
  }

  /** Précédent désactivé quand les deux sont marqués fait (bloqué tant qu’on ne remet pas “non fait”). */
  canGoPrev(): boolean {
    const pairDone = this.bothDoneForStep(this.currentStep);
    if (pairDone) return false;

    if (this.currentStep > 0) return true;
    const prev = this.prevDifficulty();
    if (!prev) return false;
    return this.hasContentFor(prev);
  }

  /* ---------- Data load ---------- */
  private loadResources(): void {
    this.loading = true; this.error = null;
    this.ed.list().subscribe({
      next: res => {
        this.resources = (res ?? []).map(r => ({
          ...r,
          difficulty: (r as any).difficulty ?? 'MID'
        }));
        this.loading = false;
        this.applyFilter();
      },
      error: () => { this.error = 'Impossible de charger le contenu.'; this.loading = false; }
    });
  }

  /* ---------- YouTube helpers ---------- */
  private ytId(url?: string): string | null {
    if (!url) return null;
    const m1 = url.match(/youtu\.be\/([^?&/]+)/i); if (m1?.[1]) return m1[1];
    const m2 = url.match(/[?&]v=([^?&]+)/i);       if (m2?.[1]) return m2[1];
    const m3 = url.match(/youtube\.com\/embed\/([^?&/]+)/i); if (m3?.[1]) return m3[1];
    return null;
  }
  private baseEmbed(url: string): string {
    const id = this.ytId(url);
    return id ? `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1` : url;
  }
  youtubeThumb(url?: string): string | null {
    const id = this.ytId(url);
    return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
  }
  /** Build an embed URL; autoplay if this video is currently playing to meet the requirement. */
  embedFor(r: EducationResource): SafeResourceUrl | null {
    if (!r.url) return null;
    let url = this.baseEmbed(r.url);
    if (this.playingId === this.keyOf(r)) {
      // Autoplay muted to satisfy browser policies
      url += (url.includes('?') ? '&' : '?') + 'autoplay=1&mute=1';
    }
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  /* ---------- Level / sort ---------- */
  private levelDone(level: Difficulty): boolean {
    return this.isLevelFullyDone(level);
  }

  isLevelUnlocked(level: Difficulty): boolean {
    if (level === 'EASY') return true;
    if (level === 'MID') return this.levelDone('EASY');
    return this.levelDone('MID'); // ADV
  }

  setDifficulty(level: Difficulty) {
    if (!this.isLevelUnlocked(level)) return;
    this.difficulty = level;
    this.applyFilter();
    this.playingId = null;
  }

  /** True if this chip should be dimmed (previous level) */
  isDimmed(level: Difficulty): boolean {
    const curIdx = this.order.indexOf(this.difficulty);
    const lvlIdx = this.order.indexOf(level);
    return lvlIdx < curIdx;
  }

  setSort(mode: SortMode) { this.sortMode = mode; this.applyFilter(); }

  labelNiveauFR(v?: Difficulty): string {
    switch (v) {
      case 'EASY': return 'Débutant';
      case 'ADV':  return 'Avancé';
      case 'MID':
      default:     return 'Intermédiaire';
    }
  }
  classeNiveauFR(v?: Difficulty): 'debutant' | 'intermediaire' | 'avance' {
    switch (v) {
      case 'EASY': return 'debutant';
      case 'ADV':  return 'avance';
      case 'MID':
      default:     return 'intermediaire';
    }
  }

  /* ---------- Build the pair lists for the current level ---------- */
  applyFilter(): void {
    const q = (this.query || '').toLowerCase().trim();

    let arts = this.resources.filter(r => r.type === 'ARTICLE' && (r as any).difficulty === this.difficulty);
    let vids = this.resources.filter(r => r.type === 'VIDEO'   && (r as any).difficulty === this.difficulty);

    const match = (r: EducationResource) =>
      (r.title || '').toLowerCase().includes(q) ||
      (r.description || '').toLowerCase().includes(q);

    if (q) { arts = arts.filter(match); vids = vids.filter(match); }

    const byOldest = (a: EducationResource, b: EducationResource) => {
      const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return da - db;
    };
    const byAlpha = (a: EducationResource, b: EducationResource) =>
      (a.title || '').localeCompare(b.title || '');

    arts.sort(this.sortMode === 'ALPHA' ? byAlpha : byOldest);
    vids.sort(this.sortMode === 'ALPHA' ? byAlpha : byOldest);

    this.levelArticles = arts;
    this.levelVideos = vids;

    this.currentStep = 0;
  }

  /* ---------- Step navigation (auto cross-level) ---------- */
  nextStep(): void {
    if (!this.canGoNext()) return;

    if (this.currentStep < this.maxSteps - 1) {
      this.currentStep++;
    } else {
      const next = this.nextDifficulty();
      if (next && this.isLevelUnlocked(next) && this.hasContentFor(next)) {
        this.difficulty = next;
        this.applyFilter();           // resets currentStep = 0
      }
    }
    this.playingId = null;
    this.dockOpen = false;
  }

  prevStep(): void {
    if (!this.canGoPrev()) return;

    if (this.currentStep > 0) {
      this.currentStep--;
    } else {
      const prev = this.prevDifficulty();
      if (prev && this.hasContentFor(prev)) {
        this.difficulty = prev;
        this.applyFilter();
        this.currentStep = Math.max(this.maxSteps - 1, 0);
      }
    }
    this.playingId = null;
    this.dockOpen = false;
  }

  /* ---------- inline video & article overlay ---------- */
  playInCard(r: EducationResource): void {
    if (r.type !== 'VIDEO') return;
    this.playingId = this.keyOf(r);      // triggers autoplay via embedFor()
    this.markLastOpened(r);
  }

  openArticle(r: EducationResource): void {
    if (r.type !== 'ARTICLE') return;
    this.active = r;
    this.markLastOpened(r);
    this.dockOpen = true;                // fullscreen overlay
  }

  closeDock(): void { this.dockOpen = false; }

  /* ---------- progress ---------- */
  toggleComplete(r: EducationResource): void {
    const k = this.keyOf(r);
    const cur = this.progress[k];
    this.progress[k] = { ...(cur || { completed: false }), completed: !cur?.completed };
    this.saveProgress();
  }

  toggleFavorite(r: EducationResource): void {
    const k = this.keyOf(r);
    const cur = this.progress[k];
    this.progress[k] = { ...(cur || { completed: false }), favorite: !cur?.favorite };
    this.saveProgress();
  }

  /* ---------- utils ---------- */
  trackById(_i: number, r: EducationResource) { return r.id ?? r.title; }
  keyOf(r: EducationResource): string { return String(r.id ?? r.title ?? ''); }

  private loadProgress(): void {
    try {
      const raw = localStorage.getItem(this.KEY);
      this.progress = raw ? JSON.parse(raw) : {};
    } catch { this.progress = {}; }
  }

  private saveProgress(): void {
    localStorage.setItem(this.KEY, JSON.stringify(this.progress));
  }

  private markLastOpened(r: EducationResource): void {
    const k = this.keyOf(r);
    const cur = this.progress[k];
    this.progress[k] = { ...(cur || { completed: false }), lastOpenedAt: Date.now() };
    this.saveProgress();
  }
}
