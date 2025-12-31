import { Injectable } from '@angular/core';
import {
    Board,
    CellValue,
    Player,
    BOARD_WIDTH,
    BOARD_HEIGHT,
    EMPTY_CELL,
    PLAYER_HUMAN,
    PLAYER_AI,
    WinningMoveResult,
} from '../models/game.types';

@Injectable({
    providedIn: 'root',
})
export class GameService {
    private board: Board = [];
    private columnHeights: number[] = [];
    private turnCount = 0;

    player1Score = 0;
    player2Score = 0;

    constructor() {
        this.initializeBoard();
    }

    /** Initialize or reset the game board */
    initializeBoard(): void {
        this.board = Array.from({ length: BOARD_HEIGHT }, () =>
            Array(BOARD_WIDTH).fill(EMPTY_CELL)
        );
        this.columnHeights = Array(BOARD_WIDTH).fill(BOARD_HEIGHT - 1);
        this.turnCount = 0;
    }

    /** Get the current board state */
    getBoard(): Board {
        return this.board;
    }

    /** Get the current turn count */
    getTurnCount(): number {
        return this.turnCount;
    }

    /** Set turn count (used by AI for simulation) */
    setTurnCount(count: number): void {
        this.turnCount = count;
    }

    /** Get column heights array */
    getColumnHeights(): number[] {
        return this.columnHeights;
    }

    /** Get current player (1 or 2) based on turn count */
    getCurrentPlayer(): Player {
        return ((this.turnCount % 2) + 1) as Player;
    }

    /** Check if a column can accept more pieces */
    canPlay(col: number): boolean {
        return this.columnHeights[col] >= 0;
    }

    /** Insert a piece into a column, returns the row where it landed */
    insertPiece(col: number, player: Player): number {
        const row = this.columnHeights[col];
        if (row < 0) return -1;

        this.board[row][col] = player;
        this.columnHeights[col]--;
        return row;
    }

    /** Remove a piece from a position (used for AI simulation) */
    removePiece(row: number, col: number): void {
        this.board[row][col] = EMPTY_CELL;
        this.columnHeights[col]++;
    }

    /** Increment turn count */
    incrementTurn(): void {
        this.turnCount++;
    }

    /** Decrement turn count (used for AI simulation) */
    decrementTurn(): void {
        this.turnCount--;
    }

    /** Get list of columns that can accept pieces */
    getValidLocations(): number[] {
        const validLocations: number[] = [];
        for (let c = 0; c < BOARD_WIDTH; c++) {
            if (this.canPlay(c)) {
                validLocations.push(c);
            }
        }
        return validLocations;
    }

    /** Check if the board is full (draw condition) */
    isBoardFull(): boolean {
        for (let i = 0; i < BOARD_WIDTH; i++) {
            if (this.columnHeights[i] >= 0) return false;
        }
        return true;
    }

    /** Check if 4 values are equal and not empty */
    private checkLine(a: CellValue, b: CellValue, c: CellValue, d: CellValue): boolean {
        return a !== EMPTY_CELL && a === b && a === c && a === d;
    }

    /** Check for a winner, returns player number or -1 if no winner */
    checkWinner(): CellValue {
        // Vertical
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < BOARD_WIDTH; c++) {
                if (this.checkLine(
                    this.board[r][c],
                    this.board[r + 1][c],
                    this.board[r + 2][c],
                    this.board[r + 3][c]
                )) {
                    return this.board[r][c];
                }
            }
        }

        // Horizontal
        for (let r = 0; r < BOARD_HEIGHT; r++) {
            for (let c = 0; c < 4; c++) {
                if (this.checkLine(
                    this.board[r][c],
                    this.board[r][c + 1],
                    this.board[r][c + 2],
                    this.board[r][c + 3]
                )) {
                    return this.board[r][c];
                }
            }
        }

        // Diagonal (down-right)
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 4; c++) {
                if (this.checkLine(
                    this.board[r][c],
                    this.board[r + 1][c + 1],
                    this.board[r + 2][c + 2],
                    this.board[r + 3][c + 3]
                )) {
                    return this.board[r][c];
                }
            }
        }

        // Diagonal (up-right)
        for (let r = 3; r < BOARD_HEIGHT; r++) {
            for (let c = 0; c < 4; c++) {
                if (this.checkLine(
                    this.board[r][c],
                    this.board[r - 1][c + 1],
                    this.board[r - 2][c + 2],
                    this.board[r - 3][c + 3]
                )) {
                    return this.board[r][c];
                }
            }
        }

        return EMPTY_CELL;
    }

    /** Check if placing a piece in a column would win for the current player */
    isWinningMove(col: number): boolean {
        const currentPlayer = this.getCurrentPlayer();
        const row = this.columnHeights[col];

        if (row < 0) return false;

        // Check vertical (need 3 below)
        if (row <= 2 &&
            this.board[row + 1]?.[col] === currentPlayer &&
            this.board[row + 2]?.[col] === currentPlayer &&
            this.board[row + 3]?.[col] === currentPlayer) {
            return true;
        }

        // Check horizontal and diagonal directions
        for (let dy = -1; dy <= 1; dy++) {
            let count = 0;
            for (let dx = -1; dx <= 1; dx += 2) {
                for (let x = col + dx, y = row + dx * dy;
                    x >= 0 && x < BOARD_WIDTH && y >= 0 && y < BOARD_HEIGHT;
                    x += dx, y += dx * dy) {
                    if (this.board[y][x] !== currentPlayer) break;
                    count++;
                }
            }
            if (count >= 3) return true;
        }

        return false;
    }

    /** Find a winning move for the current player */
    findWinningMove(): WinningMoveResult {
        for (let i = 0; i < BOARD_WIDTH; i++) {
            if (this.canPlay(i) && this.isWinningMove(i)) {
                return { col: i, result: true, player: this.getCurrentPlayer() };
            }
        }
        return { col: null, result: false, player: this.getCurrentPlayer() };
    }

    /** Check if the game is in a terminal state */
    isTerminalNode(): boolean {
        return this.findWinningMove().result || this.isBoardFull();
    }

    /** Increment score for a player */
    incrementScore(player: Player): void {
        if (player === PLAYER_HUMAN) {
            this.player1Score++;
        } else {
            this.player2Score++;
        }
    }

    /** Get the cell value at a position */
    getCellValue(row: number, col: number): CellValue {
        return this.board[row][col];
    }

    /** Set cell value (for AI simulation) */
    setCellValue(row: number, col: number, value: CellValue): void {
        this.board[row][col] = value;
    }
}
