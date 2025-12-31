import { Component, OnInit } from '@angular/core';
import { NgToastService } from 'ng-angular-popup';
import { GameService } from './services/game.service';
import { AiService } from './services/ai.service';
import {
  BOARD_WIDTH,
  BOARD_HEIGHT,
  PLAYER_HUMAN,
  PLAYER_AI,
  Player,
} from './models/game.types';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {
  title = 'Connect4 AI';

  /** Array indices for template iteration */
  readonly rows = Array.from({ length: BOARD_HEIGHT }, (_, i) => i);
  readonly cols = Array.from({ length: BOARD_WIDTH }, (_, i) => i);

  /** Track which cells are clickable */
  cellsEnabled: boolean[][] = [];

  /** Track if game is processing (prevents double-clicks) */
  isProcessing = false;

  constructor(
    private toast: NgToastService,
    public gameService: GameService,
    private aiService: AiService
  ) { }

  ngOnInit(): void {
    this.resetGame();
  }

  /** Get the CSS class for a cell based on its value */
  getCellClass(row: number, col: number): string {
    const value = this.gameService.getCellValue(row, col);
    switch (value) {
      case PLAYER_HUMAN:
        return 'cell cell--player1';
      case PLAYER_AI:
        return 'cell cell--player2';
      default:
        return 'cell cell--empty';
    }
  }

  /** Check if a cell should show a clickable button */
  isCellClickable(row: number, col: number): boolean {
    return this.cellsEnabled[row]?.[col] ?? false;
  }

  /** Handle cell click */
  onCellClick(row: number, col: number): void {
    if (this.isProcessing) return;

    // Check for draw before player move
    if (this.gameService.isBoardFull()) {
      this.handleDraw();
      return;
    }

    this.isProcessing = true;

    // Player makes move
    this.gameService.insertPiece(col, PLAYER_HUMAN);
    this.gameService.incrementTurn();

    // Check if player won
    const winner = this.gameService.checkWinner();
    if (winner !== -1) {
      this.handleWin(winner as Player);
      return;
    }

    // Check for draw after player move
    if (this.gameService.isBoardFull()) {
      this.handleDraw();
      return;
    }

    // AI makes move
    const aiCol = this.aiService.makeMove();
    if (aiCol !== null) {
      this.gameService.insertPiece(aiCol, PLAYER_AI);
      this.gameService.incrementTurn();
    }

    // Check if AI won
    const aiWinner = this.gameService.checkWinner();
    if (aiWinner !== -1) {
      this.handleWin(aiWinner as Player);
      return;
    }

    // Check for draw after AI move
    if (this.gameService.isBoardFull()) {
      this.handleDraw();
      return;
    }

    this.isProcessing = false;
  }

  /** Handle win scenario */
  private handleWin(winner: Player): void {
    this.disableAllCells();
    this.gameService.incrementScore(winner);

    const winnerName = winner === PLAYER_HUMAN ? 'You' : 'AI';
    const message = winner === PLAYER_HUMAN ? 'win!!' : 'wins!!';

    this.toast.success({
      detail: 'WE HAVE A WINNER!',
      summary: `${winnerName} ${message}`,
      duration: 3000,
    });

    setTimeout(() => this.resetGame(), 3000);
  }

  /** Handle draw scenario */
  private handleDraw(): void {
    this.disableAllCells();

    this.toast.success({
      detail: 'Game ended in a draw!',
      summary: '',
      duration: 3000,
    });

    setTimeout(() => this.resetGame(), 3000);
  }

  /** Disable all cells (game over state) */
  private disableAllCells(): void {
    this.cellsEnabled = this.rows.map(() => this.cols.map(() => false));
  }

  /** Enable all cells (new game state) */
  private enableAllCells(): void {
    this.cellsEnabled = this.rows.map(() => this.cols.map(() => true));
  }

  /** Reset the game to initial state */
  private resetGame(): void {
    this.gameService.initializeBoard();
    this.enableAllCells();
    this.isProcessing = false;
  }

  /** Get player 1 score */
  get player1Score(): number {
    return this.gameService.player1Score;
  }

  /** Get player 2 (AI) score */
  get player2Score(): number {
    return this.gameService.player2Score;
  }
}
