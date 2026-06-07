// Project: Sudoku Solver
// Developer: Imtiaz Adar
// Contact: www.linkedin.com/in/imtiaz-ahmed-adar
const API_BASE = window.location.origin;
let currentBoard = [];
let currentSolution = [];
let fixedCells = [];
let selectedRow = null;
let selectedCol = null;
let mistakes = 0;
let hintsUsed = 0;
let currentDifficulty = 'easy';

// Audio - with better error handling
const moveSound = document.getElementById('moveSound');
const winSound = document.getElementById('winSound');
const loseSound = document.getElementById('loseSound');
const loseSound1 = document.getElementById('loseSound1');

function playMoveSound() {
    if (moveSound) {
        moveSound.currentTime = 0;
        moveSound.play().catch(e => console.log('Audio play failed:', e));
    }
}

function playWinSound() {
    if (winSound) {
        winSound.currentTime = 0;
        winSound.play().catch(e => console.log('Audio play failed:', e));
    }
}

function playLoseSound() {
    if (loseSound) {
        loseSound.currentTime = 0;
        loseSound.play().catch(e => console.log('Audio play failed:', e));
    }
}

function playLoseSound1() {
    if (loseSound1) {
        loseSound1.currentTime = 0;
        loseSound1.play().catch(e => console.log('Audio play failed:', e));
    }
}

function showToast(message, isError = false) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toast.style.background = isError ? 'rgba(244, 67, 54, 0.9)' : 'rgba(0, 0, 0, 0.9)';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
}

// Navigation
function showHome() {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById('homePage').classList.add('active');
}

function showGame() {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById('gamePage').classList.add('active');
    if (currentBoard.length === 0) {
        startGame('easy');
    }
}

function showSolver() {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById('solverPage').classList.add('active');
    initSolverBoard();
}

// Game Functions
async function startGame(difficulty) {
    currentDifficulty = difficulty;
    showToast(`Starting ${difficulty} game...`);
    
    try {
        const response = await fetch(`${API_BASE}/api/new-puzzle/${difficulty}`);
        const data = await response.json();
        
        currentBoard = data.board;
        currentSolution = data.solution;
        fixedCells = data.fixedCells;
        mistakes = 0;
        hintsUsed = 0;
        selectedRow = null;
        selectedCol = null;
        
        const mistakeElement = document.getElementById('mistakeCount');
        const hintElement = document.getElementById('hintCount');
        if (mistakeElement) mistakeElement.textContent = mistakes;
        if (hintElement) hintElement.textContent = hintsUsed;
        
        renderBoard();
        createNumberPad('numberPad', true);
        showGame();
    } catch (error) {
        console.error('Error starting game:', error);
        showToast('Failed to start game', true);
    }
}

function renderBoard() {
    const boardElement = document.getElementById('sudokuBoard');
    if (!boardElement) return;
    boardElement.innerHTML = '';
    
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            if (fixedCells[i] && fixedCells[i][j]) cell.classList.add('fixed');
            if (selectedRow === i && selectedCol === j) cell.classList.add('selected');
            
            const value = currentBoard[i] ? currentBoard[i][j] : '';
            cell.textContent = (value && value !== '') ? value : '';
            cell.setAttribute('data-row', i);
            cell.setAttribute('data-col', j);
            
            cell.onclick = () => selectCell(i, j);
            boardElement.appendChild(cell);
        }
    }
}

function selectCell(row, col) {
    if (fixedCells[row] && fixedCells[row][col]) return;
    
    selectedRow = row;
    selectedCol = col;
    renderBoard();
    highlightConflicts();
}

async function highlightConflicts() {
    if (selectedRow === null || selectedCol === null) return;
    
    const value = currentBoard[selectedRow] ? currentBoard[selectedRow][selectedCol] : null;
    if (!value || value === '') return;
    
    try {
        const response = await fetch(`${API_BASE}/api/validate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                board: currentBoard,
                row: selectedRow,
                col: selectedCol,
                value: value
            })
        });
        
        const data = await response.json();
        
        document.querySelectorAll('.cell').forEach(cell => {
            cell.classList.remove('conflict');
        });
        
        if (data.conflicts && Array.isArray(data.conflicts)) {
            data.conflicts.forEach(index => {
                const row = Math.floor(index / 9);
                const col = index % 9;
                const cell = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
                if (cell) cell.classList.add('conflict');
            });
        }
    } catch (error) {
        console.error('Error validating move:', error);
    }
}

async function enterNumber(number) {
    if (selectedRow === null || selectedCol === null) {
        showToast('Select a cell first!');
        return;
    }
    
    if (fixedCells[selectedRow] && fixedCells[selectedRow][selectedCol]) return;
    
    playMoveSound();
    
    currentBoard[selectedRow][selectedCol] = number;
    renderBoard();
    
    try {
        const response = await fetch(`${API_BASE}/api/validate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                board: currentBoard,
                row: selectedRow,
                col: selectedCol,
                value: number
            })
        });
        
        const data = await response.json();
        if (!data.valid) {
            mistakes++;
            const mistakeElement = document.getElementById('mistakeCount');
            if (mistakeElement) mistakeElement.textContent = mistakes;
            showToast(`Mistake! Total mistakes: ${mistakes}`, true);
        }
    } catch (error) {
        console.error('Error validating move:', error);
    }
    
    highlightConflicts();
    checkWin();
}

function eraseNumber() {
    if (selectedRow === null || selectedCol === null) return;
    if (fixedCells[selectedRow] && fixedCells[selectedRow][selectedCol]) return;
    
    playMoveSound();
    currentBoard[selectedRow][selectedCol] = '';
    renderBoard();
    highlightConflicts();
}

async function useHint() {
    if (hintsUsed >= 3) {
        showToast('You have used all 3 hints!', true);
        return;
    }
    
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            if (!fixedCells[i][j] && (currentBoard[i][j] === '' || currentBoard[i][j] !== currentSolution[i][j])) {
                currentBoard[i][j] = currentSolution[i][j];
                hintsUsed++;
                const hintElement = document.getElementById('hintCount');
                if (hintElement) hintElement.textContent = hintsUsed;
                selectedRow = i;
                selectedCol = j;
                renderBoard();
                highlightConflicts();
                playMoveSound();
                showToast(`Hint used! ${3 - hintsUsed} remaining`);
                
                let allFilled = true;
                for (let r = 0; r < 9; r++) {
                    for (let c = 0; c < 9; c++) {
                        if (currentBoard[r][c] === '' || currentBoard[r][c] === null) {
                            allFilled = false;
                            break;
                        }
                    }
                }
                if (allFilled) {
                    checkWin();
                }
                return;
            }
        }
    }
    
    showToast('No hint needed! The puzzle is complete!');
    checkWin();
}

// This is for GAME page - ONLY CHECKS solution, does NOT auto-fill
function solveGame() {
    // Check if all cells are filled
    let allFilled = true;
    let emptyCount = 0;
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            if (currentBoard[i][j] === '' || currentBoard[i][j] === null) {
                allFilled = false;
                emptyCount++;
            }
        }
    }
    
    if (!allFilled) {
        playLoseSound();
        showToast(`Please fill all cells first! ${emptyCount} empty cell(s) remaining.`, true);
        return;
    }
    
    // Check if solution is correct
    let isCorrect = true;
    let firstError = null;
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            if (currentBoard[i][j] !== currentSolution[i][j]) {
                isCorrect = false;
                firstError = {row: i, col: j};
                break;
            }
        }
    }
    
    if (isCorrect) {
        playWinSound();
        showToast(`Perfect! You solved it correctly with ${mistakes} mistakes! 🎉`);
        setTimeout(() => {
            if (confirm('Congratulations! Play again?')) {
                startGame(currentDifficulty);
            }
        }, 500);
    } else {
        showToast(`Incorrect at row ${firstError.row + 1}, column ${firstError.col + 1}. Keep trying!`, true);
        playLoseSound();
    }
}

function checkWin() {
    let allFilled = true;
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            if (currentBoard[i][j] === '' || currentBoard[i][j] === null) {
                allFilled = false;
                break;
            }
        }
    }
    
    if (!allFilled) return;
    
    let isCorrect = true;
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            if (currentBoard[i][j] !== currentSolution[i][j]) {
                isCorrect = false;
                break;
            }
        }
    }
    
    if (isCorrect) {
        playWinSound();
        showToast(`Congratulations! You solved it with ${mistakes} mistakes!`);
        setTimeout(() => {
            if (confirm('Congratulations! Play again?')) {
                startGame(currentDifficulty);
            }
        }, 500);
    }
}

function resetGame() {
    startGame(currentDifficulty);
}

// Solver Functions
function initSolverBoard() {
    const solverBoard = document.getElementById('solverBoard');
    if (!solverBoard) return;
    solverBoard.innerHTML = '';
    
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.textContent = '';
            cell.setAttribute('data-row', i);
            cell.setAttribute('data-col', j);
            cell.onclick = () => selectSolverCell(i, j);
            solverBoard.appendChild(cell);
        }
    }
    
    createNumberPad('solverNumberPad', false);
    window.solverBoard = Array(9).fill().map(() => Array(9).fill(''));
    window.solverSelectedRow = null;
    window.solverSelectedCol = null;
}

function selectSolverCell(row, col) {
    window.solverSelectedRow = row;
    window.solverSelectedCol = col;
    
    document.querySelectorAll('#solverBoard .cell').forEach(cell => {
        cell.classList.remove('selected');
    });
    
    const selectedCell = document.querySelector(`#solverBoard .cell[data-row="${row}"][data-col="${col}"]`);
    if (selectedCell) {
        selectedCell.classList.add('selected');
    }
}

function solverEnterNumber(number) {
    if (window.solverSelectedRow === null || window.solverSelectedCol === null) {
        showToast('Select a cell first!');
        return;
    }
    
    playMoveSound();
    
    if (!window.solverBoard) {
        window.solverBoard = Array(9).fill().map(() => Array(9).fill(''));
    }
    
    window.solverBoard[window.solverSelectedRow][window.solverSelectedCol] = number;
    
    const cell = document.querySelector(`#solverBoard .cell[data-row="${window.solverSelectedRow}"][data-col="${window.solverSelectedCol}"]`);
    if (cell) {
        cell.textContent = number;
        // Force reflow to prevent any size changes
        void cell.offsetHeight;
    }
}

function solverErase() {
    if (window.solverSelectedRow === null || window.solverSelectedCol === null) return;
    
    playMoveSound();
    window.solverBoard[window.solverSelectedRow][window.solverSelectedCol] = '';
    
    const cell = document.querySelector(`#solverBoard .cell[data-row="${window.solverSelectedRow}"][data-col="${window.solverSelectedCol}"]`);
    if (cell) cell.textContent = '';
}

function solverClear() {
    window.solverBoard = Array(9).fill().map(() => Array(9).fill(''));
    document.querySelectorAll('#solverBoard .cell').forEach(cell => {
        cell.textContent = '';
    });
    showToast('Board cleared!');
}

// FIXED: This is for SOLVER page - AUTO-FILLS the solution (valid behavior for solver)
async function solveSudoku() {
    showToast('Solving Sudoku...');
    
    try {
        const response = await fetch(`${API_BASE}/api/solve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ board: window.solverBoard })
        });
        
        const data = await response.json();
        
        if (data.solved) {
            window.solverBoard = data.board;
            
            for (let i = 0; i < 9; i++) {
                for (let j = 0; j < 9; j++) {
                    const cell = document.querySelector(`#solverBoard .cell[data-row="${i}"][data-col="${j}"]`);
                    if (cell && data.board[i][j] && data.board[i][j] !== '') {
                        cell.textContent = data.board[i][j];
                        cell.classList.add('solved-highlight');
                        setTimeout(() => {
                            cell.classList.remove('solved-highlight');
                        }, 500);
                    }
                }
            }
            
            playWinSound();
            showToast('Sudoku solved successfully!');
        } else {
            playLoseSound1();
            showToast('This puzzle has no solution!', true);
        }
    } catch (error) {
        console.error('Error solving Sudoku:', error);
        playLoseSound1();
        showToast('Failed to solve Sudoku', true);
    }
}

function createNumberPad(containerId, isGame) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    
    const numbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
    
    numbers.forEach(number => {
        const btn = document.createElement('button');
        btn.className = 'number-btn';
        btn.textContent = number;
        
        if (isGame) {
            btn.onclick = () => enterNumber(number);
        } else {
            btn.onclick = () => solverEnterNumber(number);
        }
        
        container.appendChild(btn);
    });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    showHome();
});