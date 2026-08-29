import { ComponentFixture, TestBed, fakeAsync, flush } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { NgToastModule } from 'ng-angular-popup';
import { GameService } from './services/game.service';
import { AiService } from './services/ai.service';
import {
  PLAYER_HUMAN,
  PLAYER_AI,
  BOARD_WIDTH,
  DIFFICULTY_LEVELS,
  DIFFICULTY_SETTINGS,
} from './models/game.types';
import { setBoard, countPieces, HUMAN_TO_MOVE } from '../testing/board-helpers';

describe('AppComponent', () => {
  let fixture: ComponentFixture<AppComponent>;
  let app: AppComponent;
  let game: GameService;
  let ai: AiService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgToastModule],
      declarations: [AppComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    app = fixture.componentInstance;
    game = TestBed.inject(GameService);
    ai = TestBed.inject(AiService);

    game.player1Score = 0;
    game.player2Score = 0;
    fixture.detectChanges(); // ngOnInit -> resetGame
  });

  describe('scaffolding', () => {
    it('should create the app', () => {
      expect(app).toBeTruthy();
    });

    it('should have title Connect4 AI', () => {
      expect(app.title).toEqual('Connect4 AI');
    });

    it('should render game title', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.game-title')?.textContent).toContain('CONNECT 4');
    });

    it('should initialize with scores at 0', () => {
      expect(app.player1Score).toEqual(0);
      expect(app.player2Score).toEqual(0);
    });

    it('should have 6 rows and 7 columns', () => {
      expect(app.rows.length).toEqual(6);
      expect(app.cols.length).toEqual(7);
    });

    it('starts a fresh game with an empty board', () => {
      expect(countPieces(game)).toBe(0);
      expect(game.getTurnCount()).toBe(0);
    });
  });

  describe('cell rendering', () => {
    it('maps each cell value to its modifier class', () => {
      setBoard(game, [
        '.......',
        '.......',
        '.......',
        '.......',
        '.......',
        'XO.....',
      ], HUMAN_TO_MOVE);

      expect(app.getCellClass(5, 0)).toBe('cell cell--player1');
      expect(app.getCellClass(5, 1)).toBe('cell cell--player2');
      expect(app.getCellClass(5, 2)).toBe('cell cell--empty');
    });

    it('renders a clickable button for every cell while the game is live', () => {
      const buttons = (fixture.nativeElement as HTMLElement).querySelectorAll('.cell-button');
      expect(buttons.length).toBe(42);
    });
  });

  describe('taking a turn', () => {
    it('drops the human piece to the bottom of the clicked column', () => {
      app.onCellClick(0, 3);

      expect(game.getCellValue(5, 3)).toBe(PLAYER_HUMAN);
    });

    it('lets the AI reply in the same turn', () => {
      app.onCellClick(0, 3);

      expect(countPieces(game)).toBe(2);
      expect(game.getBoard().flat().filter(c => c === PLAYER_AI).length).toBe(1);
    });

    it('advances the turn count by two - one move each', () => {
      app.onCellClick(0, 3);

      expect(game.getTurnCount()).toBe(2);
    });

    it('routes a click on any row to the same column', () => {
      app.onCellClick(0, 6);

      expect(game.getCellValue(5, 6)).toBe(PLAYER_HUMAN);
    });

    it('plays a move when a rendered cell button is clicked', () => {
      const buttons = (fixture.nativeElement as HTMLElement)
        .querySelectorAll<HTMLButtonElement>('.cell-button');
      buttons[5 * BOARD_WIDTH + 2].click();
      fixture.detectChanges();

      expect(game.getCellValue(5, 2)).toBe(PLAYER_HUMAN);
    });

    it('ignores clicks while a turn is already being processed', () => {
      app.isProcessing = true;

      app.onCellClick(0, 3);

      expect(countPieces(game)).toBe(0);
      expect(game.getTurnCount()).toBe(0);
    });

    it('ignores a click on a full column', () => {
      setBoard(game, [
        'X......',
        'O......',
        'X......',
        'O......',
        'X......',
        'O......',
      ], HUMAN_TO_MOVE);
      const piecesBefore = countPieces(game);

      app.onCellClick(0, 0);

      expect(countPieces(game)).toBe(piecesBefore);
      expect(game.getTurnCount()).toBe(HUMAN_TO_MOVE);
    });
  });

  describe('winning', () => {
    it('credits the human and freezes the board', fakeAsync(() => {
      setBoard(game, [
        '.......',
        '.......',
        '.......',
        '.......',
        '.O.....',
        'XXX.O.O',
      ], HUMAN_TO_MOVE);

      app.onCellClick(0, 3);

      expect(game.checkWinner()).toBe(PLAYER_HUMAN);
      expect(app.player1Score).toBe(1);
      expect(app.isCellClickable(5, 0)).toBeFalse();

      flush();
    }));

    it('does not let the AI reply after the human has won', fakeAsync(() => {
      setBoard(game, [
        '.......',
        '.......',
        '.......',
        '.......',
        '.O.....',
        'XXX.O.O',
      ], HUMAN_TO_MOVE);
      const piecesBefore = countPieces(game);

      app.onCellClick(0, 3);

      expect(countPieces(game)).toBe(piecesBefore + 1);

      flush();
    }));

    it('credits the AI when it completes a line', fakeAsync(() => {
      setBoard(game, [
        '.......',
        '.......',
        '.......',
        '.......',
        'X......',
        'X.OOO.X',
      ], HUMAN_TO_MOVE);

      app.onCellClick(0, 5);

      expect(app.player2Score).toBe(1);

      flush();
    }));

    it('starts a new game after the result is shown', fakeAsync(() => {
      setBoard(game, [
        '.......',
        '.......',
        '.......',
        '.......',
        '.O.....',
        'XXX.O.O',
      ], HUMAN_TO_MOVE);

      app.onCellClick(0, 3);
      flush();

      expect(countPieces(game)).toBe(0);
      expect(game.getTurnCount()).toBe(0);
      expect(app.isProcessing).toBeFalse();
      expect(app.isCellClickable(0, 0)).toBeTrue();
    }));

    it('keeps the score across the reset', fakeAsync(() => {
      setBoard(game, [
        '.......',
        '.......',
        '.......',
        '.......',
        '.O.....',
        'XXX.O.O',
      ], HUMAN_TO_MOVE);

      app.onCellClick(0, 3);
      flush();

      expect(app.player1Score).toBe(1);
    }));
  });

  describe('drawing', () => {
    it('freezes the board and resets when the last slot is filled', fakeAsync(() => {
      setBoard(game, [
        '.XXOOOX',
        'OOOXXXO',
        'XXXOOOX',
        'OOOXXXO',
        'XXXOOOX',
        'OOOXXXO',
      ], HUMAN_TO_MOVE);

      app.onCellClick(0, 0);

      expect(game.checkWinner()).toBe(-1);
      expect(app.isCellClickable(5, 0)).toBeFalse();

      flush();

      expect(countPieces(game)).toBe(0);
    }));
  });

  describe('difficulty picker', () => {
    const buttons = () =>
      Array.from(
        (fixture.nativeElement as HTMLElement)
          .querySelectorAll<HTMLButtonElement>('.difficulty-button')
      );

    it('starts on hard, so the default game is the AI as it always played', () => {
      expect(app.difficulty).toBe('hard');
    });

    it('pushes the starting level to the AI on init', () => {
      ai.setDifficulty('easy');

      app.ngOnInit();

      expect(ai.getDifficulty()).toBe('hard');
    });

    it('renders one button per level, labelled from the settings table', () => {
      expect(buttons().length).toBe(DIFFICULTY_LEVELS.length);
      expect(buttons().map(b => b.textContent?.trim())).toEqual(
        DIFFICULTY_LEVELS.map(level => DIFFICULTY_SETTINGS[level].label)
      );
    });

    it('marks only the selected level as active', () => {
      const active = buttons().filter(b =>
        b.classList.contains('difficulty-button--active')
      );

      expect(active.length).toBe(1);
      expect(active[0].textContent?.trim())
        .toBe(DIFFICULTY_SETTINGS[app.difficulty].label);
      expect(active[0].getAttribute('aria-pressed')).toBe('true');
    });

    it('switches level when a button is clicked', () => {
      const easy = buttons()[DIFFICULTY_LEVELS.indexOf('easy')];

      easy.click();
      fixture.detectChanges();

      expect(app.difficulty).toBe('easy');
      expect(ai.getDifficulty()).toBe('easy');
      expect(easy.classList).toContain('difficulty-button--active');
    });

    it('tells the AI service about the change', () => {
      app.onDifficultyChange('expert');

      expect(ai.getDifficulty()).toBe('expert');
    });

    it('ignores a change while a turn is still being processed', () => {
      app.isProcessing = true;

      app.onDifficultyChange('easy');

      expect(app.difficulty).toBe('hard');
      expect(ai.getDifficulty()).toBe('hard');
    });

    it('does not re-apply the level already selected', () => {
      const setDifficulty = spyOn(ai, 'setDifficulty');

      app.onDifficultyChange(app.difficulty);

      expect(setDifficulty).not.toHaveBeenCalled();
    });

    it('disables the buttons while a turn is being processed', () => {
      app.isProcessing = true;
      fixture.detectChanges();

      expect(buttons().every(b => b.disabled)).toBeTrue();
    });

    it('keeps the board when the level changes mid-game', () => {
      app.onCellClick(0, 3);
      const piecesBefore = countPieces(game);

      app.onDifficultyChange('easy');

      expect(countPieces(game)).toBe(piecesBefore);
    });

    it('labels every level', () => {
      DIFFICULTY_LEVELS.forEach(level => {
        expect(app.difficultyLabel(level))
          .toBe(DIFFICULTY_SETTINGS[level].label);
      });
    });
  });

});
