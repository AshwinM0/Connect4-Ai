import { GameService } from '../app/services/game.service';
import {
    BOARD_WIDTH,
    BOARD_HEIGHT,
    EMPTY_CELL,
    PLAYER_HUMAN,
    PLAYER_AI,
    CellValue,
} from '../app/models/game.types';

/**
 * ASCII board notation used throughout the specs:
 *   'X' = PLAYER_HUMAN (1)
 *   'O' = PLAYER_AI (2)
 *   '.' = empty
 *
 * Row 0 is the TOP of the board and row 5 the bottom, matching how `Board`
 * is indexed. Writing fixtures this way keeps the position visible in the
 * test instead of hidden behind a sequence of moves.
 */
export type BoardDiagram = string[];

/** Turn counts that put each side on move (turnCount % 2 + 1 === player). */
export const HUMAN_TO_MOVE = 0;
export const AI_TO_MOVE = 1;

function parseCell(ch: string): CellValue {
    switch (ch) {
        case 'X':
            return PLAYER_HUMAN;
        case 'O':
            return PLAYER_AI;
        case '.':
            return EMPTY_CELL;
        default:
            throw new Error(`Unknown board character '${ch}' (expected X, O or .)`);
    }
}

/**
 * Load an ASCII diagram into the service, recomputing column heights and
 * setting whose turn it is.
 *
 * Throws on a malformed diagram or a floating piece, so a bad fixture fails
 * loudly rather than silently testing a position that could never occur.
 */
export function setBoard(
    svc: GameService,
    diagram: BoardDiagram,
    turnCount: number = HUMAN_TO_MOVE
): void {
    if (diagram.length !== BOARD_HEIGHT) {
        throw new Error(
            `Diagram needs ${BOARD_HEIGHT} rows, got ${diagram.length}`
        );
    }

    svc.initializeBoard();

    diagram.forEach((rowText, r) => {
        if (rowText.length !== BOARD_WIDTH) {
            throw new Error(
                `Row ${r} needs ${BOARD_WIDTH} columns, got ${rowText.length}`
            );
        }
        for (let c = 0; c < BOARD_WIDTH; c++) {
            svc.setCellValue(r, c, parseCell(rowText[c]));
        }
    });

    const heights = svc.getColumnHeights();
    for (let c = 0; c < BOARD_WIDTH; c++) {
        let lowestEmpty = BOARD_HEIGHT - 1;
        while (lowestEmpty >= 0 && svc.getCellValue(lowestEmpty, c) !== EMPTY_CELL) {
            lowestEmpty--;
        }
        for (let r = lowestEmpty; r >= 0; r--) {
            if (svc.getCellValue(r, c) !== EMPTY_CELL) {
                throw new Error(
                    `Column ${c} has a floating piece at row ${r} - pieces must rest on the stack`
                );
            }
        }
        heights[c] = lowestEmpty;
    }

    svc.setTurnCount(turnCount);
}

/** Render the current board as a diagram, for readable failure messages. */
export function renderBoard(svc: GameService): string {
    const rows: string[] = [];
    for (let r = 0; r < BOARD_HEIGHT; r++) {
        let line = '';
        for (let c = 0; c < BOARD_WIDTH; c++) {
            const v = svc.getCellValue(r, c);
            line += v === PLAYER_HUMAN ? 'X' : v === PLAYER_AI ? 'O' : '.';
        }
        rows.push(line);
    }
    return '\n' + rows.join('\n');
}

/** Drop pieces into the given columns, alternating sides from the turn count. */
export function playMoves(svc: GameService, ...cols: number[]): void {
    for (const col of cols) {
        svc.insertPiece(col, svc.getCurrentPlayer());
        svc.incrementTurn();
    }
}

/** Total number of occupied cells. */
export function countPieces(svc: GameService): number {
    let total = 0;
    for (let r = 0; r < BOARD_HEIGHT; r++) {
        for (let c = 0; c < BOARD_WIDTH; c++) {
            if (svc.getCellValue(r, c) !== EMPTY_CELL) total++;
        }
    }
    return total;
}

/** Serialize everything that a search must leave untouched. */
export function snapshotState(svc: GameService): string {
    return JSON.stringify({
        board: svc.getBoard(),
        heights: svc.getColumnHeights(),
        turn: svc.getTurnCount(),
    });
}
