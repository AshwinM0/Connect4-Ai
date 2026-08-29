import { TestBed } from '@angular/core/testing';
import { GameService } from './game.service';
import {
    BOARD_WIDTH,
    BOARD_HEIGHT,
    EMPTY_CELL,
    PLAYER_HUMAN,
    PLAYER_AI,
} from '../models/game.types';
import {
    setBoard,
    playMoves,
    countPieces,
    AI_TO_MOVE,
    HUMAN_TO_MOVE,
} from '../../testing/board-helpers';

describe('GameService', () => {
    let service: GameService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(GameService);
        service.initializeBoard();
        service.player1Score = 0;
        service.player2Score = 0;
    });

    describe('initialization', () => {
        it('creates a 6x7 board', () => {
            const board = service.getBoard();
            expect(board.length).toBe(BOARD_HEIGHT);
            board.forEach(row => expect(row.length).toBe(BOARD_WIDTH));
        });

        it('starts with every cell empty', () => {
            expect(countPieces(service)).toBe(0);
        });

        it('starts every column height at the bottom row', () => {
            expect(service.getColumnHeights()).toEqual(
                Array(BOARD_WIDTH).fill(BOARD_HEIGHT - 1)
            );
        });

        it('starts at turn 0 with the human to move', () => {
            expect(service.getTurnCount()).toBe(0);
            expect(service.getCurrentPlayer()).toBe(PLAYER_HUMAN);
        });

        it('clears the board and turn count on re-initialization', () => {
            playMoves(service, 0, 1, 2);
            service.initializeBoard();

            expect(countPieces(service)).toBe(0);
            expect(service.getTurnCount()).toBe(0);
            expect(service.getColumnHeights()).toEqual(
                Array(BOARD_WIDTH).fill(BOARD_HEIGHT - 1)
            );
        });

        it('keeps scores across games', () => {
            service.incrementScore(PLAYER_HUMAN);
            service.initializeBoard();
            expect(service.player1Score).toBe(1);
        });
    });

    describe('insertPiece', () => {
        it('drops the first piece onto the bottom row', () => {
            const row = service.insertPiece(3, PLAYER_HUMAN);

            expect(row).toBe(BOARD_HEIGHT - 1);
            expect(service.getCellValue(BOARD_HEIGHT - 1, 3)).toBe(PLAYER_HUMAN);
        });

        it('stacks pieces upward from the bottom', () => {
            const landedRows = [0, 1, 2, 3, 4, 5].map(() =>
                service.insertPiece(2, PLAYER_HUMAN)
            );
            expect(landedRows).toEqual([5, 4, 3, 2, 1, 0]);
        });

        it('lowers the column height by one per piece', () => {
            service.insertPiece(0, PLAYER_HUMAN);
            expect(service.getColumnHeights()[0]).toBe(BOARD_HEIGHT - 2);
        });

        it('reports the column full once six pieces are in it', () => {
            for (let i = 0; i < BOARD_HEIGHT; i++) {
                service.insertPiece(4, PLAYER_HUMAN);
            }
            expect(service.canPlay(4)).toBeFalse();
        });

        it('returns -1 and changes nothing when the column is full', () => {
            for (let i = 0; i < BOARD_HEIGHT; i++) {
                service.insertPiece(4, PLAYER_HUMAN);
            }
            const before = countPieces(service);

            const row = service.insertPiece(4, PLAYER_AI);

            expect(row).toBe(-1);
            expect(countPieces(service)).toBe(before);
            expect(service.getColumnHeights()[4]).toBe(-1);
        });
    });

    describe('turn tracking', () => {
        it('alternates the current player each turn', () => {
            expect(service.getCurrentPlayer()).toBe(PLAYER_HUMAN);
            service.incrementTurn();
            expect(service.getCurrentPlayer()).toBe(PLAYER_AI);
            service.incrementTurn();
            expect(service.getCurrentPlayer()).toBe(PLAYER_HUMAN);
        });

        it('restores the previous player when a turn is undone', () => {
            service.incrementTurn();
            service.decrementTurn();

            expect(service.getTurnCount()).toBe(0);
            expect(service.getCurrentPlayer()).toBe(PLAYER_HUMAN);
        });
    });

    describe('getValidLocations', () => {
        it('lists every column on an empty board', () => {
            expect(service.getValidLocations()).toEqual([0, 1, 2, 3, 4, 5, 6]);
        });

        it('omits full columns', () => {
            setBoard(service, [
                'X......',
                'O......',
                'X......',
                'O......',
                'X......',
                'O......',
            ]);
            expect(service.getValidLocations()).toEqual([1, 2, 3, 4, 5, 6]);
        });
    });

    describe('isBoardFull', () => {
        it('is false on an empty board', () => {
            expect(service.isBoardFull()).toBeFalse();
        });

        it('is false when a single slot remains', () => {
            setBoard(service, [
                '.OXOXOX',
                'XXOXOXO',
                'OXOXOXO',
                'XOXOXOX',
                'OXOXOXO',
                'XOXOXOX',
            ]);
            expect(service.isBoardFull()).toBeFalse();
        });

        it('is true when every column is full', () => {
            setBoard(service, [
                'XOXOXOX',
                'OXOXOXO',
                'XOXOXOX',
                'OXOXOXO',
                'XOXOXOX',
                'OXOXOXO',
            ]);
            expect(service.isBoardFull()).toBeTrue();
        });
    });

    describe('checkWinner - vertical', () => {
        it('finds four stacked at the bottom of a column', () => {
            setBoard(service, [
                '.......',
                '.......',
                '...X...',
                '...X...',
                '...X...',
                '...X...',
            ]);
            expect(service.checkWinner()).toBe(PLAYER_HUMAN);
        });

        it('finds four stacked at the top of a column', () => {
            setBoard(service, [
                'O......',
                'O......',
                'O......',
                'O......',
                'X......',
                'X......',
            ]);
            expect(service.checkWinner()).toBe(PLAYER_AI);
        });

        it('does not fire on three stacked', () => {
            setBoard(service, [
                '.......',
                '.......',
                '.......',
                '...X...',
                '...X...',
                '...X...',
            ]);
            expect(service.checkWinner()).toBe(EMPTY_CELL);
        });
    });

    describe('checkWinner - horizontal', () => {
        it('finds four along the left edge', () => {
            setBoard(service, [
                '.......',
                '.......',
                '.......',
                '.......',
                '.......',
                'XXXX...',
            ]);
            expect(service.checkWinner()).toBe(PLAYER_HUMAN);
        });

        it('finds four along the right edge', () => {
            setBoard(service, [
                '.......',
                '.......',
                '.......',
                '.......',
                '.......',
                '...OOOO',
            ]);
            expect(service.checkWinner()).toBe(PLAYER_AI);
        });

        it('finds four on an upper row', () => {
            setBoard(service, [
                '.......',
                '.......',
                '.......',
                '.XXXX..',
                '.OOOO..',
                '.OXOX..',
            ]);
            expect(service.checkWinner()).toBe(PLAYER_HUMAN);
        });

        it('does not fire on four split by a gap', () => {
            setBoard(service, [
                '.......',
                '.......',
                '.......',
                '.......',
                '.......',
                'XXX.X..',
            ]);
            expect(service.checkWinner()).toBe(EMPTY_CELL);
        });

        it('does not fire on a mixed run', () => {
            setBoard(service, [
                '.......',
                '.......',
                '.......',
                '.......',
                '.......',
                'XXXO...',
            ]);
            expect(service.checkWinner()).toBe(EMPTY_CELL);
        });
    });

    describe('checkWinner - diagonal', () => {
        it('finds a down-right diagonal', () => {
            setBoard(service, [
                '.......',
                '.......',
                'X......',
                'OX.....',
                'OOX....',
                'OOOX...',
            ]);
            expect(service.checkWinner()).toBe(PLAYER_HUMAN);
        });

        it('finds an up-right diagonal', () => {
            setBoard(service, [
                '.......',
                '.......',
                '...X...',
                '..XO...',
                '.XOO...',
                'XOOO...',
            ]);
            expect(service.checkWinner()).toBe(PLAYER_HUMAN);
        });

        it('finds a diagonal anchored in the far corner', () => {
            setBoard(service, [
                '.......',
                '.......',
                '......O',
                '.....OX',
                '....OXX',
                '...OXXX',
            ]);
            expect(service.checkWinner()).toBe(PLAYER_AI);
        });

        it('does not fire on a three-long diagonal', () => {
            setBoard(service, [
                '.......',
                '.......',
                '.......',
                'X......',
                'OX.....',
                'OOX....',
            ]);
            expect(service.checkWinner()).toBe(EMPTY_CELL);
        });
    });

    describe('checkWinner - no winner', () => {
        it('returns empty on a fresh board', () => {
            expect(service.checkWinner()).toBe(EMPTY_CELL);
        });

        it('returns empty on a full board with no line of four', () => {
            setBoard(service, [
                'XXXOOOX',
                'OOOXXXO',
                'XXXOOOX',
                'OOOXXXO',
                'XXXOOOX',
                'OOOXXXO',
            ]);
            expect(service.checkWinner()).toBe(EMPTY_CELL);
        });
    });

    describe('isWinningMove', () => {
        it('sees a vertical win', () => {
            setBoard(service, [
                '.......',
                '.......',
                '.......',
                '...X...',
                '...X...',
                '...X...',
            ], HUMAN_TO_MOVE);
            expect(service.isWinningMove(3)).toBeTrue();
        });

        it('sees a horizontal win that fills a gap', () => {
            setBoard(service, [
                '.......',
                '.......',
                '.......',
                '.......',
                '.......',
                'XX.X...',
            ], HUMAN_TO_MOVE);
            expect(service.isWinningMove(2)).toBeTrue();
        });

        it('sees a horizontal win extending a run', () => {
            setBoard(service, [
                '.......',
                '.......',
                '.......',
                '.......',
                '.......',
                'XXX....',
            ], HUMAN_TO_MOVE);
            expect(service.isWinningMove(3)).toBeTrue();
        });

        it('sees a diagonal win', () => {
            setBoard(service, [
                '.......',
                '.......',
                'X......',
                'OX.....',
                'OOX....',
                'OOO....',
            ], HUMAN_TO_MOVE);
            expect(service.isWinningMove(3)).toBeTrue();
        });

        it('is false for a move that does not connect four', () => {
            setBoard(service, [
                '.......',
                '.......',
                '.......',
                '.......',
                '.......',
                'XX.....',
            ], HUMAN_TO_MOVE);
            expect(service.isWinningMove(2)).toBeFalse();
        });

        it('is false when the winning line belongs to the other player', () => {
            setBoard(service, [
                '.......',
                '.......',
                '.......',
                '.......',
                '.......',
                'XX.X...',
            ], AI_TO_MOVE);
            expect(service.isWinningMove(2)).toBeFalse();
        });

        it('is false for a full column', () => {
            setBoard(service, [
                'X......',
                'X......',
                'X......',
                'X......',
                'X......',
                'X......',
            ], HUMAN_TO_MOVE);
            expect(service.isWinningMove(0)).toBeFalse();
        });
    });

    describe('findWinningMove', () => {
        it('returns the winning column for the player on move', () => {
            setBoard(service, [
                '.......',
                '.......',
                '.......',
                '.......',
                '.......',
                'OOO.XX.',
            ], AI_TO_MOVE);

            const result = service.findWinningMove();

            expect(result.result).toBeTrue();
            expect(result.col).toBe(3);
            expect(result.player).toBe(PLAYER_AI);
        });

        it('reports no winning move when none exists', () => {
            setBoard(service, [
                '.......',
                '.......',
                '.......',
                '.......',
                '.......',
                'X.O....',
            ], HUMAN_TO_MOVE);

            const result = service.findWinningMove();

            expect(result.result).toBeFalse();
            expect(result.col).toBeNull();
        });
    });

    describe('isTerminalNode', () => {
        it('is true when the player on move can win', () => {
            setBoard(service, [
                '.......',
                '.......',
                '.......',
                '.......',
                '.......',
                'XXX....',
            ], HUMAN_TO_MOVE);
            expect(service.isTerminalNode()).toBeTrue();
        });

        it('is true when the board is full', () => {
            setBoard(service, [
                'XXXOOOX',
                'OOOXXXO',
                'XXXOOOX',
                'OOOXXXO',
                'XXXOOOX',
                'OOOXXXO',
            ]);
            expect(service.isTerminalNode()).toBeTrue();
        });

        it('is false for an ordinary mid-game position', () => {
            setBoard(service, [
                '.......',
                '.......',
                '.......',
                '.......',
                '.......',
                'XO.....',
            ], HUMAN_TO_MOVE);
            expect(service.isTerminalNode()).toBeFalse();
        });
    });

    describe('incrementScore', () => {
        it('credits the human', () => {
            service.incrementScore(PLAYER_HUMAN);
            expect(service.player1Score).toBe(1);
            expect(service.player2Score).toBe(0);
        });

        it('credits the AI', () => {
            service.incrementScore(PLAYER_AI);
            expect(service.player2Score).toBe(1);
            expect(service.player1Score).toBe(0);
        });
    });
});
