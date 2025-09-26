// Chess piece SVG file mapping
const pieceFiles = {
    'K': 'wk.svg', 'Q': 'wq.svg', 'R': 'wr.svg', 'B': 'wb.svg', 'N': 'wn.svg', 'P': 'wp.svg', 'A': 'wa.svg',
    'k': 'bk.svg', 'q': 'bq.svg', 'r': 'br.svg', 'b': 'bb.svg', 'n': 'bn.svg', 'p': 'bp.svg', 'a': 'ba.svg'
};

// Piece names for display
const pieces = {
    'K': 'King', 'Q': 'Queen', 'R': 'Rook', 'B': 'Bishop', 'N': 'Knight', 'P': 'Pawn', 'A': 'Archer',
    'k': 'King', 'q': 'Queen', 'r': 'Rook', 'b': 'Bishop', 'n': 'Knight', 'p': 'Pawn', 'a': 'Archer'
};

// Function to create SVG piece element
function createPieceElement(pieceCode) {
    const img = document.createElement('img');
    img.src = `graphics/regular/${pieceFiles[pieceCode]}`;
    img.alt = pieceCode;
    img.className = 'piece';
    img.draggable = true;
    return img;
}

// Initial board state
let board = [
    ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
    ['p', 'a', 'p', 'p', 'p', 'p', 'a', 'p'],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    ['P', 'A', 'P', 'P', 'P', 'P', 'A', 'P'],
    ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
];

let currentPlayer = 'white';
let selectedSquare = null;
let gameOver = false;
let moveHistory = [];
let whiteKingPos = [7, 4];
let blackKingPos = [0, 4];
let disabledKnights = new Set(); // Track knights that cannot move
let gameMode = 'human-vs-human'; // 'human-vs-human' or 'human-vs-computer'
let isComputerThinking = false;

// Piece values for greedy CPU
const pieceValues = {
    'P': 1, 'A': 2, 'N': 3, 'B': 3, 'R': 5, 'Q': 9, 'K': 1000,
    'p': 1, 'a': 2, 'n': 3, 'b': 3, 'r': 5, 'q': 9, 'k': 1000
};

function initBoard() {
    const boardElement = document.getElementById('chess-board');
    boardElement.innerHTML = '';
    
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const square = document.createElement('div');
            square.className = `square ${(row + col) % 2 === 0 ? 'light' : 'dark'}`;
            square.dataset.row = row;
            square.dataset.col = col;
            square.addEventListener('click', handleSquareClick);
            square.addEventListener('touchend', handleSquareTouch);
            
            if (board[row][col]) {
                const piece = createPieceElement(board[row][col]);
                piece.addEventListener('dragstart', handleDragStart);
                
                // Check if this knight is disabled
                const pieceKey = `${row}-${col}`;
                if (disabledKnights.has(pieceKey)) {
                    piece.classList.add('disabled');
                    piece.draggable = false;
                }
                
                square.appendChild(piece);
            }
            
            boardElement.appendChild(square);
        }
    }
}

function handleSquareClick(event) {
    if (gameOver) return;
    
    const row = parseInt(event.currentTarget.dataset.row);
    const col = parseInt(event.currentTarget.dataset.col);
    
    handleSquareInteraction(row, col);
}

function handleSquareTouch(event) {
    event.preventDefault(); // Prevent double-tap zoom and other touch behaviors
    if (gameOver) return;
    
    const row = parseInt(event.currentTarget.dataset.row);
    const col = parseInt(event.currentTarget.dataset.col);
    
    handleSquareInteraction(row, col);
}

function handleSquareInteraction(row, col) {
    // Don't allow interaction if computer is thinking or if it's computer's turn
    if (isComputerThinking || (gameMode === 'human-vs-computer' && currentPlayer === 'black')) {
        return;
    }
    
    if (selectedSquare) {
        if (selectedSquare.row === row && selectedSquare.col === col) {
            // Deselect if clicking the same square
            clearSelection();
        } else {
            // Try to make a move
            makeMove(selectedSquare.row, selectedSquare.col, row, col);
        }
    } else {
        // Select a piece
        if (board[row][col] && isPieceOwnedByCurrentPlayer(board[row][col])) {
            // Check if this is a disabled knight
            const pieceKey = `${row}-${col}`;
            if (disabledKnights.has(pieceKey)) {
                return; // Cannot select disabled knights
            }
            selectSquare(row, col);
        }
    }
}

function selectSquare(row, col) {
    clearSelection();
    selectedSquare = { row, col };
    const square = getSquareElement(row, col);
    square.classList.add('selected');
    highlightPossibleMoves(row, col);
}

function clearSelection() {
    selectedSquare = null;
    document.querySelectorAll('.square').forEach(square => {
        square.classList.remove('selected', 'possible-move', 'ranged-attack');
    });
}

function highlightPossibleMoves(row, col) {
    const piece = board[row][col];
    const possibleMoves = getPossibleMoves(row, col, piece);
    
    possibleMoves.forEach(([r, c]) => {
        const square = getSquareElement(r, c);
        
        // Check if this is an archer ranged attack (1 or 2 cells away vertically)
        if (piece.toLowerCase() === 'a' && (Math.abs(r - row) === 1 || Math.abs(r - row) === 2) && c === col && board[r][c]) {
            square.classList.add('ranged-attack');
        } else {
            square.classList.add('possible-move');
        }
    });
}

function makeMove(fromRow, fromCol, toRow, toCol) {
    const piece = board[fromRow][fromCol];
    
    if (!isValidMove(fromRow, fromCol, toRow, toCol, piece)) {
        clearSelection();
        return;
    }

    // Check if this is an archer ranged attack (1 or 2 cells away in front)
    const capturedPiece = board[toRow][toCol];
    const isArcherRangedAttack = piece.toLowerCase() === 'a' && 
                               (Math.abs(toRow - fromRow) === 1 || Math.abs(toRow - fromRow) === 2) && 
                               toCol === fromCol && 
                               capturedPiece;
    
    // Check if a king is being captured
    if (capturedPiece && capturedPiece.toLowerCase() === 'k') {
        const capturedKingColor = capturedPiece === 'K' ? 'White' : 'Black';
        const winningColor = currentPlayer === 'white' ? 'White' : 'Black';
        
        // Make the capture
        if (isArcherRangedAttack) {
            board[toRow][toCol] = null; // Remove the king with ranged attack
            alert(`🏹 Archer ranged attack! The ${capturedKingColor} King is destroyed!`);
        } else {
            board[toRow][toCol] = piece; // Normal capture
            board[fromRow][fromCol] = null;
        }
        
        // End the game immediately
        gameOver = true;
        updateGameStatus(`Game Over! ${winningColor} wins by capturing the ${capturedKingColor} King!`, 'checkmate');
        clearSelection();
        initBoard();
        return;
    }
    
    let knightParalyzed = false;
    let knightUndamaged = false;
    let archerRangedKill = false;
    
    if (isArcherRangedAttack) {
        if (capturedPiece.toLowerCase() === 'n') {
            // Archer attacking knight - flip coin
            const coinFlip = Math.random() < 0.5; // true = heads, false = tails
            if (coinFlip) {
                // Heads - paralyze the knight
                knightParalyzed = true;
                const knightKey = `${toRow}-${toCol}`;
                disabledKnights.add(knightKey);
                alert(`🏹 Archer ranged attack vs Knight! Coin flip: HEADS! The knight at ${String.fromCharCode(97 + toCol)}${8 - toRow} is paralyzed!`);
            } else {
                // Tails - knight takes no damage and can still move
                knightUndamaged = true;
                alert(`🏹 Archer ranged attack vs Knight! Coin flip: TAILS! The knight takes no damage!`);
            }
        } else {
            // Archer attacking other pieces (pawn, bishop, king) - capture normally but archer stays
            archerRangedKill = true;
            board[toRow][toCol] = null; // Remove the captured piece
            alert(`🏹 Archer ranged attack! The ${pieces[capturedPiece]} at ${String.fromCharCode(97 + toCol)}${8 - toRow} is destroyed!`);
        }
    }
    
    // Make the move
    if (knightParalyzed) {
        // Knight stays but is paralyzed, archer doesn't move
        clearSelection();
        initBoard();
        return;
    } else if (knightUndamaged) {
        // Knight stays undamaged, archer doesn't move
        clearSelection();
        return;
    } else if (archerRangedKill) {
        // Piece was killed by ranged attack, archer stays in place
        // Continue with normal flow to switch players
    } else {
        // Normal move
        board[toRow][toCol] = piece;
        board[fromRow][fromCol] = null;
    }

    // Update king positions
    if (piece === 'K') whiteKingPos = [toRow, toCol];
    if (piece === 'k') blackKingPos = [toRow, toCol];

    // Check if this move puts own king in check
    if (isKingInCheck(currentPlayer)) {
        // Undo the move
        board[fromRow][fromCol] = piece;
        board[toRow][toCol] = capturedPiece;
        if (piece === 'K') whiteKingPos = [fromRow, fromCol];
        if (piece === 'k') blackKingPos = [fromRow, fromCol];
        alert("Cannot make that move - it would put your king in check!");
        clearSelection();
        return;
    }

    // Record the move
    const moveNotation = `${String.fromCharCode(97 + fromCol)}${8 - fromRow}-${String.fromCharCode(97 + toCol)}${8 - toRow}`;
    moveHistory.push(`${currentPlayer}: ${moveNotation}`);
    updateMoveHistory();

    // Switch players
    currentPlayer = currentPlayer === 'white' ? 'black' : 'white';
    
    // Check for check/checkmate
    const opponentInCheck = isKingInCheck(currentPlayer);
    if (opponentInCheck) {
        if (isCheckmate(currentPlayer)) {
            gameOver = true;
            updateGameStatus(`Checkmate! ${currentPlayer === 'white' ? 'Black' : 'White'} wins!`, 'checkmate');
        } else {
            updateGameStatus(`${currentPlayer === 'white' ? 'White' : 'Black'}'s Turn - In Check!`, 'check');
        }
    } else {
        updateGameStatus(`${currentPlayer === 'white' ? 'White' : 'Black'}'s Turn`, `turn-${currentPlayer}`);
    }

    clearSelection();
    initBoard();
    highlightKingInCheck();
    
    // If it's computer's turn in human vs computer mode, make computer move
    if (gameMode === 'human-vs-computer' && currentPlayer === 'black' && !gameOver) {
        setTimeout(makeComputerMove, 1000); // Add delay for better UX
    }
}

function isValidMove(fromRow, fromCol, toRow, toCol, piece) {
    if (toRow < 0 || toRow > 7 || toCol < 0 || toCol > 7) return false;
    
    const targetPiece = board[toRow][toCol];
    if (targetPiece && isPieceOwnedByCurrentPlayer(targetPiece)) return false;

    const possibleMoves = getPossibleMoves(fromRow, fromCol, piece);
    return possibleMoves.some(([r, c]) => r === toRow && c === toCol);
}

function getPossibleMoves(row, col, piece) {
    const moves = [];
    const pieceType = piece.toLowerCase();
    const isWhite = piece === piece.toUpperCase();

    switch (pieceType) {
        case 'p': // Pawn
            const direction = isWhite ? -1 : 1;
            const startRow = isWhite ? 6 : 1;
            
            // Check if forward move is within bounds
            if (row + direction >= 0 && row + direction < 8) {
                // Forward move
                if (board[row + direction][col] === null) {
                    moves.push([row + direction, col]);
                    // Two squares forward from starting position
                    if (row === startRow && row + 2 * direction >= 0 && row + 2 * direction < 8 && board[row + 2 * direction][col] === null) {
                        moves.push([row + 2 * direction, col]);
                    }
                }
                
                // Diagonal captures
                if (col > 0 && board[row + direction][col - 1] && 
                    !isPieceOwnedByCurrentPlayer(board[row + direction][col - 1])) {
                    moves.push([row + direction, col - 1]);
                }
                if (col < 7 && board[row + direction][col + 1] && 
                    !isPieceOwnedByCurrentPlayer(board[row + direction][col + 1])) {
                    moves.push([row + direction, col + 1]);
                }
            }
            break;

        case 'r': // Rook
            // Horizontal and vertical moves
            for (let i = 1; i < 8; i++) {
                // Right
                if (col + i < 8) {
                    if (board[row][col + i] === null) {
                        moves.push([row, col + i]);
                    } else {
                        if (!isPieceOwnedByCurrentPlayer(board[row][col + i])) {
                            moves.push([row, col + i]);
                        }
                        break;
                    }
                }
            }
            for (let i = 1; i < 8; i++) {
                // Left
                if (col - i >= 0) {
                    if (board[row][col - i] === null) {
                        moves.push([row, col - i]);
                    } else {
                        if (!isPieceOwnedByCurrentPlayer(board[row][col - i])) {
                            moves.push([row, col - i]);
                        }
                        break;
                    }
                }
            }
            for (let i = 1; i < 8; i++) {
                // Down
                if (row + i < 8) {
                    if (board[row + i][col] === null) {
                        moves.push([row + i, col]);
                    } else {
                        if (!isPieceOwnedByCurrentPlayer(board[row + i][col])) {
                            moves.push([row + i, col]);
                        }
                        break;
                    }
                }
            }
            for (let i = 1; i < 8; i++) {
                // Up
                if (row - i >= 0) {
                    if (board[row - i][col] === null) {
                        moves.push([row - i, col]);
                    } else {
                        if (!isPieceOwnedByCurrentPlayer(board[row - i][col])) {
                            moves.push([row - i, col]);
                        }
                        break;
                    }
                }
            }
            break;

        case 'n': // Knight
            const knightMoves = [
                [-2, -1], [-2, 1], [-1, -2], [-1, 2],
                [1, -2], [1, 2], [2, -1], [2, 1]
            ];
            knightMoves.forEach(([dr, dc]) => {
                const newRow = row + dr;
                const newCol = col + dc;
                if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
                    if (board[newRow][newCol] === null || !isPieceOwnedByCurrentPlayer(board[newRow][newCol])) {
                        moves.push([newRow, newCol]);
                    }
                }
            });
            break;

        case 'b': // Bishop
            // Diagonal moves
            for (let i = 1; i < 8; i++) {
                // Up-right
                if (row - i >= 0 && col + i < 8) {
                    if (board[row - i][col + i] === null) {
                        moves.push([row - i, col + i]);
                    } else {
                        if (!isPieceOwnedByCurrentPlayer(board[row - i][col + i])) {
                            moves.push([row - i, col + i]);
                        }
                        break;
                    }
                }
            }
            for (let i = 1; i < 8; i++) {
                // Up-left
                if (row - i >= 0 && col - i >= 0) {
                    if (board[row - i][col - i] === null) {
                        moves.push([row - i, col - i]);
                    } else {
                        if (!isPieceOwnedByCurrentPlayer(board[row - i][col - i])) {
                            moves.push([row - i, col - i]);
                        }
                        break;
                    }
                }
            }
            for (let i = 1; i < 8; i++) {
                // Down-right
                if (row + i < 8 && col + i < 8) {
                    if (board[row + i][col + i] === null) {
                        moves.push([row + i, col + i]);
                    } else {
                        if (!isPieceOwnedByCurrentPlayer(board[row + i][col + i])) {
                            moves.push([row + i, col + i]);
                        }
                        break;
                    }
                }
            }
            for (let i = 1; i < 8; i++) {
                // Down-left
                if (row + i < 8 && col - i >= 0) {
                    if (board[row + i][col - i] === null) {
                        moves.push([row + i, col - i]);
                    } else {
                        if (!isPieceOwnedByCurrentPlayer(board[row + i][col - i])) {
                            moves.push([row + i, col - i]);
                        }
                        break;
                    }
                }
            }
            break;

        case 'q': // Queen (combination of rook and bishop)
            // Combine rook and bishop moves
            moves.push(...getPossibleMoves(row, col, isWhite ? 'R' : 'r'));
            moves.push(...getPossibleMoves(row, col, isWhite ? 'B' : 'b'));
            break;

        case 'k': // King
            const kingMoves = [
                [-1, -1], [-1, 0], [-1, 1],
                [0, -1],           [0, 1],
                [1, -1],  [1, 0],  [1, 1]
            ];
            kingMoves.forEach(([dr, dc]) => {
                const newRow = row + dr;
                const newCol = col + dc;
                if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
                    if (board[newRow][newCol] === null || !isPieceOwnedByCurrentPlayer(board[newRow][newCol])) {
                        moves.push([newRow, newCol]);
                    }
                }
            });
            break;

        case 'a': // Archer
            // Movement: like king - one space in any direction, but cannot capture by moving
            const archerMoves = [
                [-1, -1], [-1, 0], [-1, 1],
                [0, -1],           [0, 1],
                [1, -1],  [1, 0],  [1, 1]
            ];
            archerMoves.forEach(([dr, dc]) => {
                const newRow = row + dr;
                const newCol = col + dc;
                if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
                    // Archer can only move to empty squares, cannot capture by moving
                    if (board[newRow][newCol] === null) {
                        moves.push([newRow, newCol]);
                    }
                }
            });
            
            // Ranged Attack: 1 or 2 cells away only in front, only pawns, bishops, kings, knights, and other archers
            const attackDirection = isWhite ? -1 : 1;
            
            // Check 1 cell away
            const attackRow1 = row + attackDirection;
            if (attackRow1 >= 0 && attackRow1 < 8) {
                const targetPiece = board[attackRow1][col];
                if (targetPiece && !isPieceOwnedByCurrentPlayer(targetPiece)) {
                    const targetType = targetPiece.toLowerCase();
                    if (targetType === 'p' || targetType === 'b' || targetType === 'k' || targetType === 'n' || targetType === 'a') {
                        moves.push([attackRow1, col]);
                    }
                }
            }
            
            // Check 2 cells away
            const attackRow2 = row + (2 * attackDirection);
            if (attackRow2 >= 0 && attackRow2 < 8) {
                const targetPiece = board[attackRow2][col];
                if (targetPiece && !isPieceOwnedByCurrentPlayer(targetPiece)) {
                    const targetType = targetPiece.toLowerCase();
                    if (targetType === 'p' || targetType === 'b' || targetType === 'k' || targetType === 'n' || targetType === 'a') {
                        moves.push([attackRow2, col]);
                    }
                }
            }
            break;
    }

    return moves;
}

function isPieceOwnedByCurrentPlayer(piece) {
    if (currentPlayer === 'white') {
        return piece === piece.toUpperCase();
    } else {
        return piece === piece.toLowerCase();
    }
}

function isKingInCheck(player) {
    const kingPos = player === 'white' ? whiteKingPos : blackKingPos;
    const opponentPlayer = player === 'white' ? 'black' : 'white';
    
    // Check if any opponent piece can attack the king
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            if (piece && ((opponentPlayer === 'white' && piece === piece.toUpperCase()) || 
                          (opponentPlayer === 'black' && piece === piece.toLowerCase()))) {
                const moves = getPossibleMoves(row, col, piece);
                if (moves.some(([r, c]) => r === kingPos[0] && c === kingPos[1])) {
                    return true;
                }
            }
        }
    }
    return false;
}

function isCheckmate(player) {
    // If not in check, it's not checkmate
    if (!isKingInCheck(player)) return false;
    
    // Try all possible moves for the current player
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            if (piece && ((player === 'white' && piece === piece.toUpperCase()) || 
                          (player === 'black' && piece === piece.toLowerCase()))) {
                const possibleMoves = getPossibleMoves(row, col, piece);
                
                for (const [toRow, toCol] of possibleMoves) {
                    // Simulate the move
                    const originalPiece = board[toRow][toCol];
                    board[toRow][toCol] = piece;
                    board[row][col] = null;
                    
                    // Update king position if king moved
                    let originalKingPos = null;
                    if (piece === 'K') {
                        originalKingPos = [...whiteKingPos];
                        whiteKingPos = [toRow, toCol];
                    } else if (piece === 'k') {
                        originalKingPos = [...blackKingPos];
                        blackKingPos = [toRow, toCol];
                    }
                    
                    // Check if still in check
                    const stillInCheck = isKingInCheck(player);
                    
                    // Restore the board
                    board[row][col] = piece;
                    board[toRow][toCol] = originalPiece;
                    
                    // Restore king position
                    if (originalKingPos) {
                        if (piece === 'K') whiteKingPos = originalKingPos;
                        if (piece === 'k') blackKingPos = originalKingPos;
                    }
                    
                    // If this move gets out of check, it's not checkmate
                    if (!stillInCheck) {
                        return false;
                    }
                }
            }
        }
    }
    
    return true; // No legal moves found, it's checkmate
}

function highlightKingInCheck() {
    document.querySelectorAll('.square').forEach(square => {
        square.classList.remove('in-check');
    });
    
    if (isKingInCheck('white')) {
        const square = getSquareElement(whiteKingPos[0], whiteKingPos[1]);
        square.classList.add('in-check');
    }
    
    if (isKingInCheck('black')) {
        const square = getSquareElement(blackKingPos[0], blackKingPos[1]);
        square.classList.add('in-check');
    }
}

function getSquareElement(row, col) {
    return document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
}

function updateGameStatus(message, className) {
    const statusElement = document.getElementById('game-status');
    statusElement.textContent = message;
    statusElement.className = `game-status ${className}`;
}

function updateMoveHistory() {
    const movesElement = document.getElementById('moves');
    movesElement.innerHTML = '';
    
    moveHistory.forEach(move => {
        const moveElement = document.createElement('span');
        moveElement.className = 'move';
        moveElement.textContent = move;
        movesElement.appendChild(moveElement);
    });
}

function changeGameMode() {
    const select = document.getElementById('game-mode');
    gameMode = select.value;
    resetGame(); // Reset the game when mode changes
}

function resetGame() {
    board = [
        ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
        ['p', 'a', 'p', 'p', 'p', 'p', 'a', 'p'],
        [null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null],
        ['P', 'A', 'P', 'P', 'P', 'P', 'A', 'P'],
        ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
    ];
    currentPlayer = 'white';
    selectedSquare = null;
    gameOver = false;
    moveHistory = [];
    whiteKingPos = [7, 4];
    blackKingPos = [0, 4];
    disabledKnights.clear(); // Clear disabled knights
    isComputerThinking = false;
    updateGameStatus("White's Turn", 'turn-white');
    updateMoveHistory();
    initBoard();
}

function makeComputerMove() {
    if (gameOver || (gameMode !== 'human-vs-computer' && gameMode !== 'human-vs-greedy') || currentPlayer !== 'black') {
        return;
    }
    
    isComputerThinking = true;
    updateGameStatus("Computer is thinking...", 'computer-thinking');
    
    // Get all possible moves for black pieces
    const allMoves = getAllPossibleMovesForPlayer('black');
    
    if (allMoves.length === 0) {
        isComputerThinking = false;
        return;
    }
    
    // Separate attacking moves from non-attacking moves
    const attackingMoves = [];
    const nonAttackingMoves = [];
    
    allMoves.forEach(move => {
        const [fromRow, fromCol, toRow, toCol] = move;
        const targetPiece = board[toRow][toCol];
        if (targetPiece && targetPiece.toLowerCase() !== 'k') {
            attackingMoves.push(move);
        } else {
            nonAttackingMoves.push(move);
        }
    });
    
    let selectedMove = null;
    
    if (attackingMoves.length > 0) {
        if (gameMode === 'human-vs-greedy') {
            // Greedy: pick the attack that maximizes the value of the captured piece
            let maxValue = -Infinity;
            let bestMoves = [];
            attackingMoves.forEach(move => {
                const [fromRow, fromCol, toRow, toCol] = move;
                const targetPiece = board[toRow][toCol];
                const value = pieceValues[targetPiece] || 0;
                if (value > maxValue) {
                    maxValue = value;
                    bestMoves = [move];
                } else if (value === maxValue) {
                    bestMoves.push(move);
                }
            });
            selectedMove = bestMoves[Math.floor(Math.random() * bestMoves.length)];
        } else {
            // Random: pick any attack
            selectedMove = attackingMoves[Math.floor(Math.random() * attackingMoves.length)];
        }
    } else {
        // No attacking moves, pick a non-attacking move or repeat last resort
        selectedMove = nonAttackingMoves[Math.floor(Math.random() * nonAttackingMoves.length)];
    }
    
    const [fromRow, fromCol, toRow, toCol] = selectedMove;
    const piece = board[fromRow][fromCol];
    board[toRow][toCol] = piece;
    board[fromRow][fromCol] = null;

    // Update king positions
    if (piece === 'K') whiteKingPos = [toRow, toCol];
    if (piece === 'k') blackKingPos = [toRow, toCol];

    // Switch players
    currentPlayer = currentPlayer === 'white' ? 'black' : 'white';
    
    // Check for check/checkmate
    const opponentInCheck = isKingInCheck(currentPlayer);
    if (opponentInCheck) {
        if (isCheckmate(currentPlayer)) {
            gameOver = true;
            updateGameStatus(`Checkmate! ${currentPlayer === 'white' ? 'Black' : 'White'} wins!`, 'checkmate');
        } else {
            updateGameStatus(`${currentPlayer === 'white' ? 'White' : 'Black'}'s Turn - In Check!`, 'check');
        }
    } else {
        updateGameStatus(`${currentPlayer === 'white' ? 'White' : 'Black'}'s Turn`, `turn-${currentPlayer}`);
    }

    clearSelection();
    initBoard();
    highlightKingInCheck();
    
    isComputerThinking = false;
}

function getAllPossibleMovesForPlayer(player) {
    const allMoves = [];
    const isWhite = player === 'white';
    
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            if (piece && ((isWhite && piece === piece.toUpperCase()) || (!isWhite && piece === piece.toLowerCase()))) {
                const possibleMoves = getPossibleMoves(row, col, piece);
                possibleMoves.forEach(move => {
                    allMoves.push([row, col, move[0], move[1]]);
                });
            }
        }
    }
    
    return allMoves;
}

function handleDragStart(event) {
    // Don't allow drag if computer is thinking or if it's computer's turn
    if (isComputerThinking || (gameMode === 'human-vs-computer' && currentPlayer === 'black') || (gameMode === 'human-vs-greedy' && currentPlayer === 'black')) {
        event.preventDefault();
        return;
    }
    const square = event.target.parentElement;
    const row = parseInt(square.dataset.row);
    const col = parseInt(square.dataset.col);
    if (isPieceOwnedByCurrentPlayer(board[row][col])) {
        selectSquare(row, col);
        event.target.classList.add('dragging');
    } else {
        event.preventDefault();
    }
}

// Modal functions
function showRules() {
    document.getElementById('rulesModal').style.display = 'block';
}

function closeRules() {
    document.getElementById('rulesModal').style.display = 'none';
}

// Initialize the board on page load
window.addEventListener('DOMContentLoaded', () => {
    initBoard();
    updateGameStatus("White's Turn", 'turn-white');
});

// Close modal when clicking outside
window.addEventListener('click', (event) => {
    const modal = document.getElementById('rulesModal');
    if (event.target === modal) {
        closeRules();
    }
});
