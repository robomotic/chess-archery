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
let isEditMode = false;
let selectedPalettePiece = null;

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
            square.addEventListener('dragover', handleDragOver);
            square.addEventListener('drop', handleDrop);
            square.addEventListener('dragleave', handleDragLeave);
            
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
    // In edit mode, don't handle clicks - only drag and drop
    if (isEditMode) {
        return;
    }
    
    // Don't allow interaction if computer is thinking or if it's computer's turn
    if (isComputerThinking || (gameMode !== 'human-vs-human' && currentPlayer === 'black')) {
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

// Handle drag start for pieces
function handleDragStart(event) {
    if (gameOver) {
        event.preventDefault();
        return;
    }
    
    // In edit mode, handle board piece dragging differently
    if (isEditMode) {
        const square = event.target.parentElement;
        const row = parseInt(square.dataset.row);
        const col = parseInt(square.dataset.col);
        
        event.dataTransfer.setData('text/plain', JSON.stringify({ 
            type: 'board-piece',
            piece: board[row][col],
            fromRow: row, 
            fromCol: col 
        }));
        event.target.classList.add('dragging-from-board');
        return;
    }
    
    // Don't allow dragging if computer is thinking or if it's computer's turn
    if (isComputerThinking || (gameMode !== 'human-vs-human' && currentPlayer === 'black')) {
        event.preventDefault();
        return;
    }
    
    const square = event.target.parentElement;
    const row = parseInt(square.dataset.row);
    const col = parseInt(square.dataset.col);
    const piece = board[row][col];
    
    // Only allow dragging own pieces
    if (!piece || !isPieceOwnedByCurrentPlayer(piece)) {
        event.preventDefault();
        return;
    }
    
    // Check if this is a disabled knight
    const pieceKey = `${row}-${col}`;
    if (disabledKnights.has(pieceKey)) {
        event.preventDefault();
        return;
    }
    
    // Store the drag data
    event.dataTransfer.setData('text/plain', JSON.stringify({ row, col }));
    event.target.classList.add('dragging');
    
    // Select the square and highlight possible moves
    selectSquare(row, col);
}



// Handle drag over event
function handleDragOver(event) {
    event.preventDefault(); // Necessary to allow drop
    
    if (isEditMode) {
        event.dataTransfer.dropEffect = 'move';
        // Add visual feedback for edit mode
        if (event.target.classList.contains('square')) {
            event.target.classList.add('drag-over');
        }
    } else {
        event.dataTransfer.dropEffect = 'move';
    }
}

// Handle drop event
function handleDrop(event) {
    event.preventDefault();
    
    // Remove drag over styling
    event.currentTarget.classList.remove('drag-over');
    
    const dragData = JSON.parse(event.dataTransfer.getData('text/plain'));
    const square = event.currentTarget;
    const toRow = parseInt(square.dataset.row);
    const toCol = parseInt(square.dataset.col);
    
    // Remove dragging classes
    document.querySelectorAll('.dragging-from-board').forEach(el => {
        el.classList.remove('dragging-from-board');
    });
    
    if (isEditMode) {
        handleEditModeDrop(dragData, toRow, toCol);
        return;
    }
    
    // Regular game mode drop
    const fromRow = dragData.row;
    const fromCol = dragData.col;
    makeMove(fromRow, fromCol, toRow, toCol);
}

// Handle drag leave event
function handleDragLeave(event) {
    // Remove drag over styling when leaving a square
    event.currentTarget.classList.remove('drag-over');
}

// Handle edit mode drop
function handleEditModeDrop(dragData, toRow, toCol) {
    if (dragData.type === 'board-piece') {
        // Moving a piece on the board
        const fromRow = dragData.fromRow;
        const fromCol = dragData.fromCol;
        
        // Move the piece
        board[toRow][toCol] = dragData.piece;
        board[fromRow][fromCol] = null;
        
        // Update king positions
        if (dragData.piece === 'K') whiteKingPos = [toRow, toCol];
        if (dragData.piece === 'k') blackKingPos = [toRow, toCol];
        
        initBoard();
        updateGameStatus(`${getPieceName(dragData.piece)} moved to ${String.fromCharCode(65 + toCol)}${8 - toRow}`, 'edit-mode');
    }
}

// Handle remove zone drag over
function handleRemoveZoneDragOver(event) {
    if (!isEditMode) return;
    
    event.preventDefault();
    
    // Note: getData is not reliable in dragover, so we'll use a simpler approach
    const draggedElement = document.querySelector('.dragging-from-board');
    if (draggedElement) {
        event.dataTransfer.dropEffect = 'move';
        event.currentTarget.classList.add('remove-zone-active');
        event.currentTarget.textContent = "Drop here to remove piece";
    }
}

// Handle remove zone drop
function handleRemoveZoneDrop(event) {
    if (!isEditMode) return;
    
    event.preventDefault();
    event.currentTarget.classList.remove('remove-zone-active');
    
    const dragData = JSON.parse(event.dataTransfer.getData('text/plain'));
    
    if (dragData.type === 'board-piece') {
        // Remove the piece from the board
        board[dragData.fromRow][dragData.fromCol] = null;
        
        // Clear king position if removing a king
        if (dragData.piece === 'K') whiteKingPos = null;
        if (dragData.piece === 'k') blackKingPos = null;
        
        // Remove dragging classes
        document.querySelectorAll('.dragging-from-board').forEach(el => {
            el.classList.remove('dragging-from-board');
        });
        
        initBoard();
        updateGameStatus(`${getPieceName(dragData.piece)} removed from board`, 'edit-mode');
    } else {
        updateGameStatus("Edit Mode - Drag pieces on the board to move them or remove them", 'edit-mode');
    }
}

// Handle remove zone drag leave
function handleRemoveZoneDragLeave(event) {
    if (!isEditMode) return;
    
    event.currentTarget.classList.remove('remove-zone-active');
    updateGameStatus("Edit Mode - Drag pieces on the board to move them or remove them", 'edit-mode');
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

    // Check if this is an archer ranged attack
    const capturedPiece = board[toRow][toCol];
    const isArcherRangedAttack = piece.toLowerCase() === 'a' && capturedPiece && (
        // Vertical attacks: 1 or 2 cells away vertically (forward or backward)
        ((Math.abs(toRow - fromRow) === 1 || Math.abs(toRow - fromRow) === 2) && toCol === fromCol) ||
        // Diagonal attacks: 1 cell away diagonally
        (Math.abs(toRow - fromRow) === 1 && Math.abs(toCol - fromCol) === 1)
    );
    
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
        // Don't return early - continue to switch players
    } else if (knightUndamaged) {
        // Knight stays undamaged, archer doesn't move
        // Don't return early - continue to switch players
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
    const fromSquare = `${String.fromCharCode(97 + fromCol)}${8 - fromRow}`;
    const toSquare = `${String.fromCharCode(97 + toCol)}${8 - toRow}`;
    const pieceNotation = piece.toLowerCase() + (currentPlayer === 'white' ? 'w' : 'b');
    
    let moveNotation;
    if (isArcherRangedAttack) {
        // Special notation for archer ranged attacks
        if (knightParalyzed) {
            moveNotation = `${pieceNotation} ${fromSquare}→${toSquare} (Knight paralyzed)`;
        } else if (knightUndamaged) {
            moveNotation = `${pieceNotation} ${fromSquare}→${toSquare} (Knight undamaged)`;
        } else {
            moveNotation = `${pieceNotation} ${fromSquare}→${toSquare} (Ranged kill)`;
        }
    } else if (capturedPiece) {
        // Regular capture
        const capturedNotation = capturedPiece.toLowerCase() + (capturedPiece === capturedPiece.toUpperCase() ? 'w' : 'b');
        moveNotation = `${pieceNotation} ${fromSquare}x${capturedNotation}@${toSquare}`;
    } else {
        // Regular move
        moveNotation = `${pieceNotation} ${fromSquare}-${toSquare}`;
    }
    
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
    
    // If it's computer's turn in any computer mode, make computer move
    if ((gameMode === 'human-vs-computer' || gameMode === 'human-vs-greedy' || gameMode === 'human-vs-minimax') && currentPlayer === 'black' && !gameOver) {
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
    
    // Handle case where piece might be null or undefined
    if (!piece) return moves;
    
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
            // Check if knight is disabled (paralyzed)
            const knightKey = `${row}-${col}`;
            if (disabledKnights.has(knightKey)) {
                return []; // Disabled knights cannot move
            }
            
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
            
            // Ranged Attacks
            const forwardDirection = isWhite ? -1 : 1;
            const backwardDirection = isWhite ? 1 : -1;
            
            // Forward attacks: 1 or 2 cells away vertically in front
            for (let distance = 1; distance <= 2; distance++) {
                const attackRow = row + (distance * forwardDirection);
                if (attackRow >= 0 && attackRow < 8) {
                    const targetPiece = board[attackRow][col];
                    if (targetPiece && !isPieceOwnedByCurrentPlayer(targetPiece)) {
                        const targetType = targetPiece.toLowerCase();
                        if (targetType === 'p' || targetType === 'b' || targetType === 'k' || targetType === 'n' || targetType === 'a') {
                            moves.push([attackRow, col]);
                        }
                    }
                }
            }
            
            // Backward attacks: 1 or 2 cells away vertically behind
            for (let distance = 1; distance <= 2; distance++) {
                const attackRow = row + (distance * backwardDirection);
                if (attackRow >= 0 && attackRow < 8) {
                    const targetPiece = board[attackRow][col];
                    if (targetPiece && !isPieceOwnedByCurrentPlayer(targetPiece)) {
                        const targetType = targetPiece.toLowerCase();
                        if (targetType === 'p' || targetType === 'b' || targetType === 'k' || targetType === 'n' || targetType === 'a') {
                            moves.push([attackRow, col]);
                        }
                    }
                }
            }
            
            // Diagonal attacks: 1 cell away diagonally in all directions
            const diagonalAttacks = [
                [-1, -1], [-1, 1], [1, -1], [1, 1]
            ];
            diagonalAttacks.forEach(([dr, dc]) => {
                const attackRow = row + dr;
                const attackCol = col + dc;
                if (attackRow >= 0 && attackRow < 8 && attackCol >= 0 && attackCol < 8) {
                    const targetPiece = board[attackRow][attackCol];
                    if (targetPiece && !isPieceOwnedByCurrentPlayer(targetPiece)) {
                        const targetType = targetPiece.toLowerCase();
                        if (targetType === 'p' || targetType === 'b' || targetType === 'k' || targetType === 'n' || targetType === 'a') {
                            moves.push([attackRow, attackCol]);
                        }
                    }
                }
            });
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
    
    // Show/hide minimax settings
    const minimaxSettings = document.getElementById('minimax-settings');
    const editModeControls = document.getElementById('edit-mode-controls');
    
    if (gameMode === 'human-vs-minimax') {
        minimaxSettings.style.display = 'block';
        editModeControls.style.display = 'none';
        isEditMode = false;
    } else if (gameMode === 'edit-mode') {
        minimaxSettings.style.display = 'none';
        editModeControls.style.display = 'block';
        isEditMode = true;
        selectedPalettePiece = null;
        updateGameStatus("Edit Mode - Drag pieces on the board to move them or remove them", 'edit-mode');
    } else {
        minimaxSettings.style.display = 'none';
        editModeControls.style.display = 'none';
        isEditMode = false;
    }
    
    if (!isEditMode) {
        resetGameState(); // Reset the game state but preserve board position
    } else {
        initBoard(); // Just refresh the board display in edit mode
    }
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
    whiteKingPos = [7, 4];
    blackKingPos = [0, 4];
    resetGameState();
}

// Reset game state without changing board position
function resetGameState() {
    currentPlayer = 'white';
    selectedSquare = null;
    gameOver = false;
    moveHistory = [];
    disabledKnights.clear(); // Clear disabled knights
    isComputerThinking = false;
    
    // Find kings on the current board
    findKingPositions();
    
    updateGameStatus("White's Turn", 'turn-white');
    updateMoveHistory();
    initBoard();
}

// Find and update king positions on the current board
function findKingPositions() {
    whiteKingPos = null;
    blackKingPos = null;
    
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            if (board[row][col] === 'K') {
                whiteKingPos = [row, col];
            }
            if (board[row][col] === 'k') {
                blackKingPos = [row, col];
            }
        }
    }
}

function exportGameHistory() {
    if (moveHistory.length === 0) {
        alert("No moves to export. Play some moves first!");
        return;
    }
    
    // Create the content with each move on a new line
    const content = moveHistory.join('\n');
    
    // Create a blob with the content
    const blob = new Blob([content], { type: 'text/plain' });
    
    // Create a temporary URL for the blob
    const url = URL.createObjectURL(blob);
    
    // Create a temporary anchor element to trigger the download
    const a = document.createElement('a');
    a.href = url;
    a.download = 'chess_game_history.txt';
    
    // Append to body, click, and remove
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    // Clean up the URL
    URL.revokeObjectURL(url);
}

// Edit Mode Functions

function getPieceName(piece) {
    const names = {
        'K': 'White King', 'Q': 'White Queen', 'R': 'White Rook', 'B': 'White Bishop', 
        'N': 'White Knight', 'A': 'White Archer', 'P': 'White Pawn',
        'k': 'Black King', 'q': 'Black Queen', 'r': 'Black Rook', 'b': 'Black Bishop', 
        'n': 'Black Knight', 'a': 'Black Archer', 'p': 'Black Pawn'
    };
    return names[piece] || 'Unknown Piece';
}

function clearBoard() {
    if (confirm('Are you sure you want to clear the entire board?')) {
        board = Array(8).fill(null).map(() => Array(8).fill(null));
        whiteKingPos = null;
        blackKingPos = null;
        disabledKnights.clear();
        initBoard();
        updateGameStatus("Board cleared - Place pieces from the palette", 'edit-mode');
    }
}

function resetToStandardSetup() {
    if (confirm('Reset to standard chess setup?')) {
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
        whiteKingPos = [7, 4];
        blackKingPos = [0, 4];
        disabledKnights.clear();
        initBoard();
        updateGameStatus("Standard setup restored - Continue editing or start game", 'edit-mode');
    }
}

function finishEditing() {
    // Validate that both kings are present
    let whiteKingFound = false;
    let blackKingFound = false;
    
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            if (board[row][col] === 'K') {
                whiteKingFound = true;
                whiteKingPos = [row, col];
            }
            if (board[row][col] === 'k') {
                blackKingFound = true;
                blackKingPos = [row, col];
            }
        }
    }
    
    if (!whiteKingFound || !blackKingFound) {
        alert('Both White and Black kings must be placed on the board before starting the game.');
        return;
    }
    
    // Switch to human vs human mode
    document.getElementById('game-mode').value = 'human-vs-human';
    gameMode = 'human-vs-human';
    isEditMode = false;
    
    // Hide edit controls
    document.getElementById('edit-mode-controls').style.display = 'none';
    
    // Initialize game state
    currentPlayer = 'white';
    selectedSquare = null;
    gameOver = false;
    moveHistory = [];
    selectedPalettePiece = null;
    
    initBoard();
    updateGameStatus("White's Turn", 'turn-white');
}



function makeComputerMove() {
    if (gameMode === 'human-vs-human') return;
    
    if (currentPlayer === 'black') {
        isComputerThinking = true;
        updateGameStatus("Computer is thinking...", 'computer-thinking');
        
        setTimeout(() => {
            if (gameMode === 'human-vs-computer') {
                makeRandomMove();
            } else if (gameMode === 'human-vs-greedy') {
                makeGreedyMove();
            } else if (gameMode === 'human-vs-minimax') {
                makeMinimaxMove();
            }
            
            isComputerThinking = false;
            updateGameStatus();
        }, 1000);
    }
}





// Random computer move (greedy approach)
function makeRandomMove() {
    console.log('Computer (Random) is thinking...');
    
    const allMoves = [];
    const attackMoves = [];
    
    // Find all possible moves for black pieces
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            if (piece && piece === piece.toLowerCase()) { // Black piece
                // Skip disabled knights
                const pieceKey = `${row}-${col}`;
                if (disabledKnights.has(pieceKey)) continue;
                
                const possibleMoves = getPossibleMoves(row, col, piece);
                for (const [toRow, toCol] of possibleMoves) {
                    const move = { fromRow: row, fromCol: col, toRow, toCol };
                    
                    // Check if this move would be legal (doesn't put own king in check)
                    if (wouldMoveBeValid(move)) {
                        allMoves.push(move);
                        
                        // Check if this is an attack move
                        if (board[toRow][toCol] && board[toRow][toCol] === board[toRow][toCol].toUpperCase()) {
                            attackMoves.push(move);
                        }
                    }
                }
            }
        }
    }
    
    let selectedMove;
    
    if (attackMoves.length > 0) {
        // If there are attack moves, randomly select one
        selectedMove = attackMoves[Math.floor(Math.random() * attackMoves.length)];
        console.log('Computer chooses to attack!');
    } else if (allMoves.length > 0) {
        // Find moves that get closer to white pieces
        const movesCloserToWhite = [];
        
        for (const move of allMoves) {
            const currentDistance = getMinDistanceToWhitePieces(move.fromRow, move.fromCol);
            const newDistance = getMinDistanceToWhitePieces(move.toRow, move.toCol);
            
            if (newDistance < currentDistance) {
                movesCloserToWhite.push(move);
            }
        }
        
        if (movesCloserToWhite.length > 0) {
            selectedMove = movesCloserToWhite[Math.floor(Math.random() * movesCloserToWhite.length)];
        } else {
            selectedMove = allMoves[Math.floor(Math.random() * allMoves.length)];
        }
    }
    
    if (selectedMove) {
        console.log(`Computer (Random) plays: ${String.fromCharCode(65 + selectedMove.fromCol)}${8 - selectedMove.fromRow} to ${String.fromCharCode(65 + selectedMove.toCol)}${8 - selectedMove.toRow}`);
        makeMove(selectedMove.fromRow, selectedMove.fromCol, selectedMove.toRow, selectedMove.toCol);
    } else {
        console.log('No valid moves found for computer');
    }
}

// Greedy computer move
function makeGreedyMove() {
    console.log('Computer (Greedy) is thinking...');
    
    const allMoves = [];
    const attackMoves = [];
    
    // Find all possible moves for black pieces
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            if (piece && piece === piece.toLowerCase()) { // Black piece
                // Skip disabled knights
                const pieceKey = `${row}-${col}`;
                if (disabledKnights.has(pieceKey)) continue;
                
                const possibleMoves = getPossibleMoves(row, col, piece);
                for (const [toRow, toCol] of possibleMoves) {
                    const move = { fromRow: row, fromCol: col, toRow, toCol };
                    
                    // Check if this move would be legal (doesn't put own king in check)
                    if (wouldMoveBeValid(move)) {
                        allMoves.push(move);
                        
                        // Check if this is an attack move
                        const targetPiece = board[toRow][toCol];
                        if (targetPiece && targetPiece === targetPiece.toUpperCase()) {
                            move.captureValue = getPieceValue(targetPiece.toLowerCase());
                            attackMoves.push(move);
                        }
                    }
                }
            }
        }
    }
    
    let selectedMove;
    
    if (attackMoves.length > 0) {
        // Choose the attack that captures the highest value piece
        attackMoves.sort((a, b) => b.captureValue - a.captureValue);
        selectedMove = attackMoves[0];
        console.log(`Computer chooses to capture ${pieces[board[selectedMove.toRow][selectedMove.toCol]]} (value: ${selectedMove.captureValue})`);
    } else if (allMoves.length > 0) {
        // Find moves that get closer to white pieces
        const movesCloserToWhite = [];
        
        for (const move of allMoves) {
            const currentDistance = getMinDistanceToWhitePieces(move.fromRow, move.fromCol);
            const newDistance = getMinDistanceToWhitePieces(move.toRow, move.toCol);
            
            if (newDistance < currentDistance) {
                movesCloserToWhite.push(move);
            }
        }
        
        if (movesCloserToWhite.length > 0) {
            selectedMove = movesCloserToWhite[Math.floor(Math.random() * movesCloserToWhite.length)];
        } else {
            selectedMove = allMoves[Math.floor(Math.random() * allMoves.length)];
        }
    }
    
    if (selectedMove) {
        console.log(`Computer (Greedy) plays: ${String.fromCharCode(65 + selectedMove.fromCol)}${8 - selectedMove.fromRow} to ${String.fromCharCode(65 + selectedMove.toCol)}${8 - selectedMove.toRow}`);
        makeMove(selectedMove.fromRow, selectedMove.fromCol, selectedMove.toRow, selectedMove.toCol);
    } else {
        console.log('No valid moves found for computer');
    }
}

// Helper function to get piece value
function getPieceValue(pieceType) {
    return pieceValues[pieceType.toUpperCase()] || 0;
}

// Helper function to check if a move would be valid
function wouldMoveBeValid(move) {
    const { fromRow, fromCol, toRow, toCol } = move;
    const piece = board[fromRow][fromCol];
    const capturedPiece = board[toRow][toCol];
    
    // Simulate the move
    board[toRow][toCol] = piece;
    board[fromRow][fromCol] = null;
    
    // Update king position if king moved
    let originalKingPos = null;
    if (piece === 'k') {
        originalKingPos = [...blackKingPos];
        blackKingPos = [toRow, toCol];
    }
    
    // Check if this puts own king in check
    const inCheck = isKingInCheck('black');
    
    // Restore the board
    board[fromRow][fromCol] = piece;
    board[toRow][toCol] = capturedPiece;
    
    // Restore king position
    if (originalKingPos) {
        blackKingPos = originalKingPos;
    }
    
    return !inCheck;
}

// Helper function to get minimum distance to any white piece
function getMinDistanceToWhitePieces(row, col) {
    let minDistance = Infinity;
    
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = board[r][c];
            if (piece && piece === piece.toUpperCase()) { // White piece
                const distance = Math.abs(r - row) + Math.abs(c - col);
                minDistance = Math.min(minDistance, distance);
            }
        }
    }
    
    return minDistance;
}

// Minimax AI Implementation
function makeMinimaxMove() {
    console.log('Computer (Minimax) is thinking...');
    
    // Get user-configurable settings
    const thinkingTimeElement = document.getElementById('thinking-time');
    const maxDepthElement = document.getElementById('max-depth');
    
    const thinkingTimeSeconds = thinkingTimeElement ? parseInt(thinkingTimeElement.value) || 5 : 5;
    const userMaxDepth = maxDepthElement ? parseInt(maxDepthElement.value) || 3 : 3;
    
    const startTime = performance.now();
    const maxTime = thinkingTimeSeconds * 1000; // Convert to milliseconds
    let depth = 1; // Start with depth 1 for faster initial response
    let bestResult = null;
    
    // Iterative deepening with time and depth control
    while (depth <= userMaxDepth) {
        const result = minimax(board, depth, -Infinity, Infinity, true, currentPlayer, startTime, maxTime);
        
        if (result.timeOut) {
            console.log(`Minimax timeout at depth ${depth}, using previous result`);
            break;
        }
        
        bestResult = result;
        
        const elapsedTime = performance.now() - startTime;
        if (elapsedTime > maxTime * 0.8) { // Use 80% of time limit as buffer
            console.log(`Stopping search at depth ${depth} (${elapsedTime.toFixed(1)}ms)`);
            break;
        }
        
        depth++;
    }
    
    if (bestResult && bestResult.move) {
        const [fromRow, fromCol, toRow, toCol] = bestResult.move;
        const elapsedTime = performance.now() - startTime;
        console.log(`Computer (Minimax) plays: ${String.fromCharCode(65 + fromCol)}${8 - fromRow} to ${String.fromCharCode(65 + toCol)}${8 - toRow} (Score: ${bestResult.score}, Time: ${elapsedTime.toFixed(1)}ms, Depth: ${depth - 1}, Max Depth: ${userMaxDepth})`);
        makeMove(fromRow, fromCol, toRow, toCol);
    } else {
        console.log('No valid moves found for computer (Minimax)');
        // Fallback to random move
        makeRandomMove();
    }
}

// Minimax algorithm with alpha-beta pruning
function minimax(boardState, depth, alpha, beta, isMaximizing, player, startTime = null, maxTime = null) {
    // Time control check
    if (startTime && maxTime && (performance.now() - startTime) > maxTime) {
        return { score: evaluatePosition(boardState), move: null, timeOut: true };
    }
    
    // Base case: leaf node or game over
    if (depth === 0 || isGameOver(boardState)) {
        return { score: evaluatePosition(boardState), move: null };
    }
    
    const allMoves = getAllPossibleMoves(boardState, player);
    
    if (allMoves.length === 0) {
        // No moves available - likely checkmate or stalemate
        return { score: isMaximizing ? -10000 : 10000, move: null };
    }
    
    let bestMove = null;
    
    if (isMaximizing) {
        // Maximizing player (Black/CPU)
        let maxScore = -Infinity;
        
        for (const move of allMoves) {
            const [fromRow, fromCol, toRow, toCol] = move;
            
            // Make the move on a copy of the board
            const boardCopy = copyBoard(boardState);
            const moveResult = simulateMove(boardCopy, fromRow, fromCol, toRow, toCol, player);
            
            if (moveResult.valid) {
                const nextPlayer = player === 'white' ? 'black' : 'white';
                const result = minimax(boardCopy, depth - 1, alpha, beta, false, nextPlayer, startTime, maxTime);
                
                if (result.score > maxScore) {
                    maxScore = result.score;
                    bestMove = move;
                }
                
                alpha = Math.max(alpha, result.score);
                
                // Alpha-beta pruning
                if (beta <= alpha) {
                    break;
                }
            }
        }
        
        return { score: maxScore, move: bestMove };
    } else {
        // Minimizing player (White/Human)
        let minScore = Infinity;
        
        for (const move of allMoves) {
            const [fromRow, fromCol, toRow, toCol] = move;
            
            // Make the move on a copy of the board
            const boardCopy = copyBoard(boardState);
            const moveResult = simulateMove(boardCopy, fromRow, fromCol, toRow, toCol, player);
            
            if (moveResult.valid) {
                const nextPlayer = player === 'white' ? 'black' : 'white';
                const result = minimax(boardCopy, depth - 1, alpha, beta, true, nextPlayer, startTime, maxTime);
                
                if (result.score < minScore) {
                    minScore = result.score;
                    bestMove = move;
                }
                
                beta = Math.min(beta, result.score);
                
                // Alpha-beta pruning
                if (beta <= alpha) {
                    break;
                }
            }
        }
        
        return { score: minScore, move: bestMove };
    }
}

// Evaluation function - assigns scores to board positions
function evaluatePosition(boardState) {
    let score = 0;
    
    // Material evaluation
    const materialScore = evaluateMaterial(boardState);
    score += materialScore;
    
    // Positional evaluation
    const positionalScore = evaluatePositions(boardState);
    score += positionalScore;
    
    // King safety
    const kingSafetyScore = evaluateKingSafety(boardState);
    score += kingSafetyScore;
    
    // Mobility (number of possible moves)
    const mobilityScore = evaluateMobility(boardState);
    score += mobilityScore;
    
    return score;
}

// Evaluate material balance
function evaluateMaterial(boardState) {
    let score = 0;
    
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = boardState[row][col];
            if (piece) {
                const value = getPieceValue(piece.toLowerCase());
                score += piece === piece.toLowerCase() ? -value : value; // Black negative, White positive
            }
        }
    }
    
    return score;
}

// Evaluate piece positions (central control, development, etc.)
function evaluatePositions(boardState) {
    let score = 0;
    
    // Center control bonus
    const centerSquares = [[3,3], [3,4], [4,3], [4,4]];
    const nearCenterSquares = [[2,2], [2,3], [2,4], [2,5], [3,2], [3,5], [4,2], [4,5], [5,2], [5,3], [5,4], [5,5]];
    
    for (const [row, col] of centerSquares) {
        const piece = boardState[row][col];
        if (piece) {
            const bonus = 0.5;
            score += piece === piece.toLowerCase() ? -bonus : bonus;
        }
    }
    
    for (const [row, col] of nearCenterSquares) {
        const piece = boardState[row][col];
        if (piece) {
            const bonus = 0.2;
            score += piece === piece.toLowerCase() ? -bonus : bonus;
        }
    }
    
    return score;
}

// Evaluate king safety
function evaluateKingSafety(boardState) {
    let score = 0;
    
    // Find kings
    let whiteKing = null, blackKing = null;
    
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            if (boardState[row][col] === 'K') whiteKing = [row, col];
            if (boardState[row][col] === 'k') blackKing = [row, col];
        }
    }
    
    // Heavy penalty for being in check
    if (whiteKing && isKingInCheckForBoard(boardState, 'white')) {
        score -= 50; // Heavy penalty for white king in check
    }
    
    if (blackKing && isKingInCheckForBoard(boardState, 'black')) {
        score += 50; // Heavy penalty for black king in check (positive because we want to avoid this for black)
    }
    
    // Penalize exposed kings (positional)
    if (whiteKing) {
        const [row, col] = whiteKing;
        if (row < 6) score -= 1; // King too far forward
    }
    
    if (blackKing) {
        const [row, col] = blackKing;
        if (row > 1) score += 1; // King too far forward
    }
    
    return score;
}

// Evaluate mobility (number of legal moves)
function evaluateMobility(boardState) {
    const whiteMoves = getAllPossibleMoves(boardState, 'white').length;
    const blackMoves = getAllPossibleMoves(boardState, 'black').length;
    
    return (blackMoves - whiteMoves) * 0.1;
}

// Get all possible moves for a player
function getAllPossibleMoves(boardState, player) {
    const moves = [];
    const isWhite = player === 'white';
    
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = boardState[row][col];
            if (piece && ((isWhite && piece === piece.toUpperCase()) || (!isWhite && piece === piece.toLowerCase()))) {
                // Skip disabled knights
                const pieceKey = `${row}-${col}`;
                if (piece.toLowerCase() === 'n' && disabledKnights.has(pieceKey)) {
                    continue;
                }
                
                const possibleMoves = getPossibleMoves(row, col, piece);
                for (const [toRow, toCol] of possibleMoves) {
                    moves.push([row, col, toRow, toCol]);
                }
            }
        }
    }
    
    return moves;
}

// Simulate a move without affecting the actual game state
function simulateMove(boardState, fromRow, fromCol, toRow, toCol, player) {
    const piece = boardState[fromRow][fromCol];
    if (!piece) return { valid: false };
    
    const isWhite = player === 'white';
    const pieceIsWhite = piece === piece.toUpperCase();
    
    if (pieceIsWhite !== isWhite) return { valid: false };
    
    // Check if move is in possible moves
    const possibleMoves = getPossibleMoves(fromRow, fromCol, piece);
    const moveExists = possibleMoves.some(([r, c]) => r === toRow && c === toCol);
    
    if (!moveExists) return { valid: false };
    
    // Check for archer ranged attack
    const isArcherRangedAttack = (piece.toLowerCase() === 'a') && 
                                boardState[toRow][toCol] !== null && (
                                    // Vertical attacks: 1 or 2 cells away vertically
                                    ((Math.abs(toRow - fromRow) === 1 || Math.abs(toRow - fromRow) === 2) && toCol === fromCol) ||
                                    // Diagonal attacks: 1 cell away diagonally
                                    (Math.abs(toRow - fromRow) === 1 && Math.abs(toCol - fromCol) === 1)
                                );
    
    if (isArcherRangedAttack) {
        // For simulation, just remove the target piece
        const targetPiece = boardState[toRow][toCol];
        if (targetPiece && targetPiece.toLowerCase() === 'n') {
            // For knights, assume 50% chance of success for evaluation
            if (Math.random() > 0.5) {
                boardState[toRow][toCol] = null;
            }
        } else {
            boardState[toRow][toCol] = null;
        }
    } else {
        // Normal move/capture
        boardState[toRow][toCol] = piece;
        boardState[fromRow][fromCol] = null;
    }
    
    // Check if this move puts own king in check
    if (isKingInCheckForBoard(boardState, isWhite ? 'white' : 'black')) {
        return { valid: false };
    }
    
    return { valid: true };
}

// Copy board state
function copyBoard(boardState) {
    return boardState.map(row => [...row]);
}

// Check if game is over
function isGameOver(boardState) {
    // Simple check - if either king is missing, game is over
    let whiteKing = false, blackKing = false;
    
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            if (boardState[row][col] === 'K') whiteKing = true;
            if (boardState[row][col] === 'k') blackKing = true;
        }
    }
    
    return !whiteKing || !blackKing;
}

// Check if king is in check for a specific board state
function isKingInCheckForBoard(boardState, player) {
    // Find the king position
    let kingPos = null;
    
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = boardState[row][col];
            if ((player === 'white' && piece === 'K') || (player === 'black' && piece === 'k')) {
                kingPos = [row, col];
                break;
            }
        }
    }
    
    if (!kingPos) return false; // No king found
    
    const opponentPlayer = player === 'white' ? 'black' : 'white';
    
    // Check if any opponent piece can attack the king
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = boardState[row][col];
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
    
    // Initialize minimax settings visibility
    changeGameMode();
});

// Close modal when clicking outside
window.addEventListener('click', (event) => {
    const modal = document.getElementById('rulesModal');
    if (event.target === modal) {
        closeRules();
    }
});
