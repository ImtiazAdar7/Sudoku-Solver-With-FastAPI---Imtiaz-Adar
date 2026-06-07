# Project: Sudoku Solver
# Developer: Imtiaz Adar
# Contact: www.linkedin.com/in/imtiaz-ahmed-adar
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import random
from typing import List, Optional
import json
import os

app = FastAPI(title="Sudoku Game", description="It's A Sudoku Game.", version="1.0.0", contact={
    "name": "Imtiaz Adar", "email": "imtiazadarofficial@gmail.com", "url": "www.linkedin.com/in/imtiaz-ahmed-adar"
})

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class SudokuPuzzle(BaseModel):
    board: List[List[Optional[str]]]
    solution: List[List[str]]
    difficulty: str

class SolveRequest(BaseModel):
    board: List[List[Optional[str]]]

class SolveResponse(BaseModel):
    solved: bool
    board: List[List[Optional[str]]]

class ValidateResponse(BaseModel):
    valid: bool
    conflicts: List[int]

# Sudoku Generator and Solver
class SudokuGenerator:
    @staticmethod
    def generate_solved_sudoku() -> List[List[str]]:
        board = [[None for _ in range(9)] for _ in range(9)]
        
        # Fill diagonal boxes
        for i in range(0, 9, 3):
            SudokuGenerator._fill_box(board, i, i)
        
        # Solve the rest
        SudokuGenerator._solve_sudoku(board)
        
        # Convert None to strings
        for i in range(9):
            for j in range(9):
                if board[i][j] is None:
                    board[i][j] = ''
                else:
                    board[i][j] = str(board[i][j])
        
        return board
    
    @staticmethod
    def _fill_box(board, row, col):
        nums = list(range(1, 10))
        random.shuffle(nums)
        idx = 0
        for i in range(3):
            for j in range(3):
                board[row + i][col + j] = nums[idx]
                idx += 1
    
    @staticmethod
    def _solve_sudoku(board):
        for row in range(9):
            for col in range(9):
                if board[row][col] is None:
                    for num in range(1, 10):
                        if SudokuGenerator._is_valid(board, row, col, num):
                            board[row][col] = num
                            if SudokuGenerator._solve_sudoku(board):
                                return True
                            board[row][col] = None
                    return False
        return True
    
    @staticmethod
    def _is_valid(board, row, col, num):
        # Check row
        for c in range(9):
            if board[row][c] == num:
                return False
        
        # Check column
        for r in range(9):
            if board[r][col] == num:
                return False
        
        # Check box
        box_row = (row // 3) * 3
        box_col = (col // 3) * 3
        for r in range(3):
            for c in range(3):
                if board[box_row + r][box_col + c] == num:
                    return False
        
        return True
    
    @staticmethod
    def remove_cells(board: List[List[str]], difficulty: str) -> List[List[Optional[str]]]:
        puzzle = [row[:] for row in board]
        
        if difficulty == "easy":
            cells_to_remove = 40
        elif difficulty == "medium":
            cells_to_remove = 55
        else:  # hard
            cells_to_remove = 65
        
        indices = list(range(81))
        random.shuffle(indices)
        
        for i in range(cells_to_remove):
            row = indices[i] // 9
            col = indices[i] % 9
            puzzle[row][col] = ''
        
        return puzzle

class SudokuSolver:
    @staticmethod
    def solve(board: List[List[Optional[str]]]) -> Optional[List[List[str]]]:
        # Convert empty strings to None for solving
        solving_board = []
        for i in range(9):
            row = []
            for j in range(9):
                val = board[i][j]
                if val == '' or val is None:
                    row.append(None)
                else:
                    try:
                        row.append(int(val))
                    except:
                        row.append(None)
            solving_board.append(row)
        
        if SudokuSolver._backtrack(solving_board):
            # Convert back to strings
            result = []
            for i in range(9):
                row = []
                for j in range(9):
                    if solving_board[i][j] is None:
                        row.append('')
                    else:
                        row.append(str(solving_board[i][j]))
                result.append(row)
            return result
        return None
    
    @staticmethod
    def _backtrack(board):
        for row in range(9):
            for col in range(9):
                if board[row][col] is None:
                    for num in range(1, 10):
                        if SudokuSolver._is_valid(board, row, col, num):
                            board[row][col] = num
                            if SudokuSolver._backtrack(board):
                                return True
                            board[row][col] = None
                    return False
        return True
    
    @staticmethod
    def _is_valid(board, row, col, num):
        for c in range(9):
            if board[row][c] == num:
                return False
        for r in range(9):
            if board[r][col] == num:
                return False
        box_row = (row // 3) * 3
        box_col = (col // 3) * 3
        for r in range(3):
            for c in range(3):
                if board[box_row + r][box_col + c] == num:
                    return False
        return True

@app.get("/api/new-puzzle/{difficulty}")
async def new_puzzle(difficulty: str):
    """Generate a new random Sudoku puzzle"""
    if difficulty not in ["easy", "medium", "hard"]:
        raise HTTPException(status_code=400, detail="Invalid difficulty")
    
    # Generate solved Sudoku
    solution = SudokuGenerator.generate_solved_sudoku()
    
    # Remove cells based on difficulty
    board = SudokuGenerator.remove_cells(solution, difficulty)
    
    # Create fixed cells mask
    fixed_cells = [[cell != '' for cell in row] for row in board]
    
    return {
        "board": board,
        "solution": solution,
        "fixedCells": fixed_cells,
        "difficulty": difficulty
    }

@app.post("/api/solve")
async def solve_puzzle(request: SolveRequest):
    """Solve a Sudoku puzzle"""
    solved_board = SudokuSolver.solve(request.board)
    
    if solved_board:
        return {"solved": True, "board": solved_board}
    else:
        return {"solved": False, "board": request.board}

@app.post("/api/validate")
async def validate_move(request: dict):
    """Validate if a move is correct"""
    board = request.get("board")
    row = request.get("row")
    col = request.get("col")
    value = request.get("value")
    
    if not value or value == '':
        return {"valid": True, "conflicts": []}
    
    conflicts = []
    
    # Check row
    for c in range(9):
        if c != col and board[row][c] == value:
            conflicts.append(row * 9 + c)
    
    # Check column
    for r in range(9):
        if r != row and board[r][col] == value:
            conflicts.append(r * 9 + col)
    
    # Check box
    box_row = (row // 3) * 3
    box_col = (col // 3) * 3
    for r in range(3):
        for c in range(3):
            if (box_row + r != row or box_col + c != col) and board[box_row + r][box_col + c] == value:
                conflicts.append((box_row + r) * 9 + (box_col + c))
    
    return {"valid": len(conflicts) == 0, "conflicts": conflicts}

@app.get("/")
async def serve_frontend():
    """Serve the main HTML file with proper encoding"""
    html_path = "static/index.html"
    
    if not os.path.exists(html_path):
        # Create a simple HTML if file doesn't exist
        return HTMLResponse(content="""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Sudoku Game</title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body>
            <h1>Sudoku Game</h1>
            <p>Please make sure the static folder contains index.html</p>
        </body>
        </html>
        """)
    
    # Read with proper encoding
    with open(html_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    return HTMLResponse(content=content)

# Create static directory if it doesn't exist
os.makedirs("static/sounds", exist_ok=True)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# index.html at /web for compatibility
@app.get("/web")
async def serve_web():
    return await serve_frontend()