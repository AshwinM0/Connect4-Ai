import { Injectable } from '@angular/core';
import { GameService } from './game.service';
import {
    BOARD_WIDTH,
    BOARD_HEIGHT,
    EMPTY_CELL,
    PLAYER_HUMAN,
    PLAYER_AI,
    Player,
} from '../models/game.types';

@Injectable({
    providedIn: 'root',
})
export class AiService {
    constructor(private gameService: GameService) { }

    /** Make the AI's move using minimax algorithm */
    makeMove(): number | null {
        const [col] = this.minimax(4, -Infinity, Infinity, true);
        return col;
    }

    /** Minimax algorithm with alpha-beta pruning */
    private minimax(
        depth: number,
        alpha: number,
        beta: number,
        maximizingPlayer: boolean
    ): [number | null, number] {
        const validLocations = this.gameService.getValidLocations();
        const isTerminal = this.gameService.isTerminalNode();

        if (depth === 0 || isTerminal) {
            if (isTerminal) {
                const winResult = this.gameService.findWinningMove();
                if (winResult.result && winResult.player === PLAYER_AI) {
                    return [winResult.col, 100000000000000];
                } else if (winResult.result && winResult.player === PLAYER_HUMAN) {
                    return [winResult.col, -10000000000000];
                } else {
                    return [null, 0];
                }
            } else {
                return [null, this.scorePosition(PLAYER_AI)];
            }
        }

        if (maximizingPlayer) {
            let value = -Infinity;
            let column = validLocations[Math.floor(Math.random() * validLocations.length)];

            for (const col of validLocations) {
                const row = this.gameService.getColumnHeights()[col];

                // Simulate move
                this.gameService.setCellValue(row, col, PLAYER_AI);
                this.gameService.incrementTurn();
                this.gameService.getColumnHeights()[col]--;

                const newScore = this.minimax(depth - 1, alpha, beta, false)[1];

                // Undo move
                this.gameService.setCellValue(row, col, EMPTY_CELL);
                this.gameService.decrementTurn();
                this.gameService.getColumnHeights()[col]++;

                if (newScore > value) {
                    value = newScore;
                    column = col;
                }
                alpha = Math.max(alpha, value);
                if (alpha >= beta) break;
            }
            return [column, value];
        } else {
            let value = Infinity;
            let column = validLocations[Math.floor(Math.random() * validLocations.length)];

            for (const col of validLocations) {
                const row = this.gameService.getColumnHeights()[col];

                // Simulate move
                this.gameService.setCellValue(row, col, PLAYER_HUMAN);
                this.gameService.incrementTurn();
                this.gameService.getColumnHeights()[col]--;

                const newScore = this.minimax(depth - 1, alpha, beta, true)[1];

                // Undo move
                this.gameService.setCellValue(row, col, EMPTY_CELL);
                this.gameService.decrementTurn();
                this.gameService.getColumnHeights()[col]++;

                if (newScore < value) {
                    value = newScore;
                    column = col;
                }
                beta = Math.min(beta, value);
                if (alpha >= beta) break;
            }
            return [column, value];
        }
    }

    /** Evaluate a window of 4 cells for scoring */
    private evaluateWindow(window: number[], piece: Player): number {
        let score = 0;
        const oppPiece = piece === PLAYER_HUMAN ? PLAYER_AI : PLAYER_HUMAN;

        const pieceCount = window.filter(cell => cell === piece).length;
        const emptyCount = window.filter(cell => cell === EMPTY_CELL).length;
        const oppCount = window.filter(cell => cell === oppPiece).length;

        if (pieceCount === 4) {
            score += 100;
        } else if (pieceCount === 3 && emptyCount === 1) {
            score += 5;
        } else if (pieceCount === 2 && emptyCount === 2) {
            score += 2;
        }

        if (oppCount === 3 && emptyCount === 1) {
            score -= 4;
        }

        return score;
    }

    /** Score the entire board position for a player */
    private scorePosition(piece: Player): number {
        let score = 0;
        const board = this.gameService.getBoard();

        // Score center column (center control is important)
        const centerCol = Math.floor(BOARD_WIDTH / 2);
        const centerArray = board.map(row => row[centerCol]);
        const centerCount = centerArray.filter(cell => cell === piece).length;
        score += centerCount * 3;

        // Score horizontal windows
        for (let r = 0; r < BOARD_HEIGHT; r++) {
            for (let c = 0; c < BOARD_WIDTH - 3; c++) {
                const window = board[r].slice(c, c + 4);
                score += this.evaluateWindow(window, piece);
            }
        }

        // Score vertical windows
        for (let c = 0; c < BOARD_WIDTH; c++) {
            for (let r = 0; r < BOARD_HEIGHT - 3; r++) {
                const window = [
                    board[r][c],
                    board[r + 1][c],
                    board[r + 2][c],
                    board[r + 3][c],
                ];
                score += this.evaluateWindow(window, piece);
            }
        }

        // Score positive diagonal windows
        for (let r = 0; r < BOARD_HEIGHT - 3; r++) {
            for (let c = 0; c < BOARD_WIDTH - 3; c++) {
                const window = [
                    board[r][c],
                    board[r + 1][c + 1],
                    board[r + 2][c + 2],
                    board[r + 3][c + 3],
                ];
                score += this.evaluateWindow(window, piece);
            }
        }

        // Score negative diagonal windows
        for (let r = 0; r < BOARD_HEIGHT - 3; r++) {
            for (let c = 0; c < BOARD_WIDTH - 3; c++) {
                const window = [
                    board[r + 3][c],
                    board[r + 2][c + 1],
                    board[r + 1][c + 2],
                    board[r][c + 3],
                ];
                score += this.evaluateWindow(window, piece);
            }
        }

        return score;
    }

    // ============================================================
    // NEGAMAX ALGORITHM
    // ============================================================

    negaMax(alpha: number, beta: number, maxomin: boolean): number {
        const board = this.gameService.getBoard();
        const num = this.gameService.getColumnHeights();
        const chance = this.gameService.getTurnCount();

        if (chance === BOARD_WIDTH * BOARD_HEIGHT) return 0;

        for (let i = 0; i < BOARD_WIDTH; i++) {
            if (this.gameService.canPlay(i) && this.gameService.isWinningMove(i)) {
                return Math.floor((BOARD_WIDTH * BOARD_HEIGHT + 1 - chance) / 2);
            }
        }

        let maxi = Math.floor((BOARD_WIDTH * BOARD_HEIGHT - 1 - chance) / 2);

        if (beta > maxi) {
            beta = maxi;
            if (alpha > beta) return beta;
        }

        for (let i = 0; i < BOARD_WIDTH; i++) {
            if (this.gameService.canPlay(i)) {
                if (maxomin) board[num[i]][i] = 1;
                else board[num[i]][i] = 2;
                num[i]--;
                this.gameService.incrementTurn();

                let score = -this.negaMax(-beta, -alpha, !maxomin);

                this.gameService.decrementTurn();
                num[i]++;
                board[num[i]][i] = -1;

                if (score >= beta) return score;
                if (score > alpha) alpha = score;
            }

            return alpha;
        }

        return 0;
    }
}
