import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { NgToastModule } from 'ng-angular-popup';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgToastModule],
      declarations: [AppComponent],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should have title Connect4 AI', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.title).toEqual('Connect4 AI');
  });

  it('should render game title', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.game-title')?.textContent).toContain('CONNECT 4');
  });

  it('should initialize with scores at 0', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.player1Score).toEqual(0);
    expect(app.player2Score).toEqual(0);
  });

  it('should have 6 rows and 7 columns', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.rows.length).toEqual(6);
    expect(app.cols.length).toEqual(7);
  });
});
