"""
Archess Environment - OpenAI Gym/Gymnasium implementation
A chess variant with Archer pieces that can perform ranged attacks.
"""

import gymnasium as gym
from gymnasium import spaces
import numpy as np
import pygame
from typing import Optional, Dict, Any, Tuple, List
import chess
import chess.engine
from enum import Enum

class PieceType(Enum):
    PAWN = 1
    KNIGHT = 2
    BISHOP = 3
    ROOK = 4
    QUEEN = 5
    KING = 6
    ARCHER = 7

class ArchessEnv(gym.Env):
    """
    Archess Environment for reinforcement learning.
    
    Observation Space:
        - 8x8x12 board representation (6 piece types x 2 colors)
        - Additional features: castling rights, en passant, disabled knights
    
    Action Space:
        - From square (64 possibilities)
        - To square (64 possibilities) 
        - Action type (move/ranged_attack)
        Total: 64 * 64 * 2 = 8192 possible actions
    """
    
    metadata = {"render_modes": ["human", "rgb_array"], "render_fps": 4}
    
    def __init__(self, render_mode: Optional[str] = None, opponent: str = "random"):
        super().__init__()
        
        # Board dimensions
        self.board_size = 8
        
        # Observation space: 8x8x12 (piece types x colors) + additional features
        self.observation_space = spaces.Box(
            low=0, high=1, shape=(8, 8, 12), dtype=np.float32
        )
        
        # Action space: from_square (64) * to_square (64) * action_type (2)
        self.action_space = spaces.Discrete(8192)
        
        # Rendering
        self.render_mode = render_mode
        self.window = None
        self.clock = None
        self.window_size = 512
        
        # Game state
        self.board = None
        self.white_king_pos = (7, 4)
        self.black_king_pos = (0, 4)
        self.disabled_knights = set()
        self.current_player = 'white'
        self.move_history = []
        self.game_over = False
        self.winner = None
        
        # Opponent type
        self.opponent = opponent
        
        # Piece values for evaluation
        self.piece_values = {
            PieceType.PAWN: 1,
            PieceType.ARCHER: 2,
            PieceType.KNIGHT: 3,
            PieceType.BISHOP: 3,
            PieceType.ROOK: 5,
            PieceType.QUEEN: 9,
            PieceType.KING: 1000
        }
        
        # Initialize board
        self.reset()
    
    def reset(self, seed: Optional[int] = None, options: Optional[Dict[str, Any]] = None):
        """Reset the environment to initial state."""
        super().reset(seed=seed)
        
        # Initialize board with Archess starting position
        self.board = np.array([
            ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
            ['p', 'a', 'p', 'p', 'p', 'p', 'a', 'p'],
            ['', '', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', ''],
            ['P', 'A', 'P', 'P', 'P', 'P', 'A', 'P'],
            ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
        ])
        
        # Reset game state
        self.white_king_pos = (7, 4)
        self.black_king_pos = (0, 4)
        self.disabled_knights = set()
        self.current_player = 'white'
        self.move_history = []
        self.game_over = False
        self.winner = None
        
        observation = self._get_observation()
        info = self._get_info()
        
        return observation, info
    
    def step(self, action: int):
        """Execute one step in the environment."""
        if self.game_over:
            return self._get_observation(), 0, True, False, self._get_info()
        
        # Decode action
        from_square, to_square, action_type = self._decode_action(action)
        
        # Execute move
        reward, terminated, truncated = self._execute_move(from_square, to_square, action_type)
        
        # If it's opponent's turn and game not over, make opponent move
        if not terminated and not truncated and self.current_player == 'black':
            self._opponent_move()
        
        observation = self._get_observation()
        info = self._get_info()
        
        return observation, reward, terminated, truncated, info
    
    def _decode_action(self, action: int) -> Tuple[Tuple[int, int], Tuple[int, int], int]:
        """Decode action integer into from_square, to_square, action_type."""
        action_type = action % 2
        action //= 2
        to_square = (action % 8, action // 8 % 8)
        from_square = (action // 64 % 8, action // 512 % 8)
        return from_square, to_square, action_type
    
    def _encode_action(self, from_square: Tuple[int, int], to_square: Tuple[int, int], action_type: int) -> int:
        """Encode move into action integer."""
        from_row, from_col = from_square
        to_row, to_col = to_square
        return (from_row * 512 + from_col * 64 + to_row * 8 + to_col) * 2 + action_type
    
    def _execute_move(self, from_square: Tuple[int, int], to_square: Tuple[int, int], action_type: int) -> Tuple[float, bool, bool]:
        """Execute a move and return reward, terminated, truncated."""
        from_row, from_col = from_square
        to_row, to_col = to_square
        
        # Validate move
        if not self._is_valid_move(from_square, to_square, action_type):
            return -0.1, False, False  # Small penalty for invalid move
        
        piece = self.board[from_row, from_col]
        captured_piece = self.board[to_row, to_col]
        
        reward = 0
        
        # Check for archer ranged attack
        is_archer_ranged = (piece.lower() == 'a' and action_type == 1 and 
                           abs(to_row - from_row) <= 2 and to_col == from_col and 
                           captured_piece != '')
        
        if is_archer_ranged:
            reward += self._handle_archer_attack(from_square, to_square)
        else:
            # Normal move/capture
            if captured_piece != '':
                reward += self._get_piece_value(captured_piece)
            
            self.board[to_row, to_col] = piece
            self.board[from_row, from_col] = ''
            
            # Update king positions
            if piece == 'K':
                self.white_king_pos = (to_row, to_col)
            elif piece == 'k':
                self.black_king_pos = (to_row, to_col)
        
        # Check for game end conditions
        terminated = self._check_game_end()
        
        # Switch players
        if not terminated:
            self.current_player = 'black' if self.current_player == 'white' else 'white'
        
        return reward, terminated, False
    
    def _handle_archer_attack(self, from_square: Tuple[int, int], to_square: Tuple[int, int]) -> float:
        """Handle archer ranged attack logic."""
        to_row, to_col = to_square
        target_piece = self.board[to_row, to_col]
        reward = 0
        
        if target_piece.lower() == 'n':  # Knight
            # Coin flip for knight paralysis
            if np.random.random() < 0.5:  # Heads - paralyze
                self.disabled_knights.add((to_row, to_col))
                reward += 1.5  # Bonus for disabling knight
            else:  # Tails - no damage
                reward += 0.1  # Small reward for attempt
        else:
            # Other pieces - kill normally
            reward += self._get_piece_value(target_piece)
            self.board[to_row, to_col] = ''
        
        return reward
    
    def _get_piece_value(self, piece: str) -> float:
        """Get the value of a piece."""
        piece_type_map = {
            'p': PieceType.PAWN, 'a': PieceType.ARCHER, 'n': PieceType.KNIGHT,
            'b': PieceType.BISHOP, 'r': PieceType.ROOK, 'q': PieceType.QUEEN, 'k': PieceType.KING
        }
        piece_type = piece_type_map.get(piece.lower(), PieceType.PAWN)
        return self.piece_values[piece_type]
    
    def _is_valid_move(self, from_square: Tuple[int, int], to_square: Tuple[int, int], action_type: int) -> bool:
        """Check if a move is valid."""
        from_row, from_col = from_square
        to_row, to_col = to_square
        
        # Check bounds
        if not (0 <= from_row < 8 and 0 <= from_col < 8 and 0 <= to_row < 8 and 0 <= to_col < 8):
            return False
        
        piece = self.board[from_row, from_col]
        if piece == '':
            return False
        
        # Check if piece belongs to current player
        is_white_piece = piece.isupper()
        if (self.current_player == 'white') != is_white_piece:
            return False
        
        # Check if target square has own piece
        target_piece = self.board[to_row, to_col]
        if target_piece != '' and (target_piece.isupper() == is_white_piece):
            return False
        
        # Get possible moves for the piece
        possible_moves = self._get_possible_moves(from_square)
        return (to_row, to_col) in possible_moves
    
    def _get_possible_moves(self, from_square: Tuple[int, int]) -> List[Tuple[int, int]]:
        """Get all possible moves for a piece at given square."""
        from_row, from_col = from_square
        piece = self.board[from_row, from_col].lower()
        is_white = self.board[from_row, from_col].isupper()
        moves = []
        
        if piece == 'p':  # Pawn
            direction = -1 if is_white else 1
            start_row = 6 if is_white else 1
            
            # Forward move
            if 0 <= from_row + direction < 8 and self.board[from_row + direction, from_col] == '':
                moves.append((from_row + direction, from_col))
                # Two squares from start
                if from_row == start_row and self.board[from_row + 2*direction, from_col] == '':
                    moves.append((from_row + 2*direction, from_col))
            
            # Captures
            for dc in [-1, 1]:
                if 0 <= from_col + dc < 8 and 0 <= from_row + direction < 8:
                    target = self.board[from_row + direction, from_col + dc]
                    if target != '' and (target.isupper() != is_white):
                        moves.append((from_row + direction, from_col + dc))
        
        elif piece == 'a':  # Archer
            # Movement (like king, but only to empty squares)
            for dr in [-1, 0, 1]:
                for dc in [-1, 0, 1]:
                    if dr == 0 and dc == 0:
                        continue
                    new_row, new_col = from_row + dr, from_col + dc
                    if 0 <= new_row < 8 and 0 <= new_col < 8 and self.board[new_row, new_col] == '':
                        moves.append((new_row, new_col))
            
            # Ranged attacks (1 or 2 cells forward)
            attack_direction = -1 if is_white else 1
            for distance in [1, 2]:
                attack_row = from_row + distance * attack_direction
                if 0 <= attack_row < 8:
                    target = self.board[attack_row, from_col]
                    if target != '' and (target.isupper() != is_white):
                        # Can attack pawns, bishops, kings, knights, archers
                        if target.lower() in ['p', 'b', 'k', 'n', 'a']:
                            moves.append((attack_row, from_col))
        
        # Add other piece types as needed...
        # (Knight, Bishop, Rook, Queen, King logic similar to original JS)
        
        return moves
    
    def _check_game_end(self) -> bool:
        """Check if game has ended."""
        # Simple check: if either king is missing
        white_king_exists = np.any(self.board == 'K')
        black_king_exists = np.any(self.board == 'k')
        
        if not white_king_exists:
            self.winner = 'black'
            self.game_over = True
            return True
        elif not black_king_exists:
            self.winner = 'white'
            self.game_over = True
            return True
        
        return False
    
    def _opponent_move(self):
        """Execute opponent move based on opponent type."""
        if self.opponent == "random":
            self._random_opponent_move()
        elif self.opponent == "greedy":
            self._greedy_opponent_move()
        # Add minimax opponent later
    
    def _random_opponent_move(self):
        """Execute a random move for the opponent."""
        valid_moves = []
        
        for from_row in range(8):
            for from_col in range(8):
                piece = self.board[from_row, from_col]
                if piece != '' and (piece.islower() == (self.current_player == 'black')):
                    possible_moves = self._get_possible_moves((from_row, from_col))
                    for to_row, to_col in possible_moves:
                        valid_moves.append(((from_row, from_col), (to_row, to_col)))
        
        if valid_moves:
            from_square, to_square = valid_moves[np.random.randint(len(valid_moves))]
            self._execute_move(from_square, to_square, 0)  # Default to normal move
    
    def _greedy_opponent_move(self):
        """Execute a greedy move (highest value capture) for the opponent."""
        best_move = None
        best_value = -1
        
        for from_row in range(8):
            for from_col in range(8):
                piece = self.board[from_row, from_col]
                if piece != '' and (piece.islower() == (self.current_player == 'black')):
                    possible_moves = self._get_possible_moves((from_row, from_col))
                    for to_row, to_col in possible_moves:
                        target = self.board[to_row, to_col]
                        if target != '':
                            value = self._get_piece_value(target)
                            if value > best_value:
                                best_value = value
                                best_move = ((from_row, from_col), (to_row, to_col))
        
        if best_move:
            from_square, to_square = best_move
            self._execute_move(from_square, to_square, 0)
        else:
            self._random_opponent_move()  # Fallback to random if no captures
    
    def _get_observation(self) -> np.ndarray:
        """Convert board state to observation array."""
        obs = np.zeros((8, 8, 12), dtype=np.float32)
        
        piece_to_index = {
            'P': 0, 'N': 1, 'B': 2, 'R': 3, 'Q': 4, 'K': 5,  # White pieces (0-5)
            'p': 6, 'n': 7, 'b': 8, 'r': 9, 'q': 10, 'k': 11,  # Black pieces (6-11)
            'A': 0, 'a': 6  # Archers map to same as pawns for simplicity
        }
        
        for row in range(8):
            for col in range(8):
                piece = self.board[row, col]
                if piece != '' and piece in piece_to_index:
                    obs[row, col, piece_to_index[piece]] = 1.0
        
        return obs
    
    def _get_info(self) -> Dict[str, Any]:
        """Get info dictionary."""
        return {
            'current_player': self.current_player,
            'move_count': len(self.move_history),
            'game_over': self.game_over,
            'winner': self.winner,
            'disabled_knights': list(self.disabled_knights)
        }
    
    def render(self):
        """Render the environment."""
        if self.render_mode == "rgb_array":
            return self._render_frame()
        elif self.render_mode == "human":
            return self._render_frame()
    
    def _render_frame(self):
        """Render a single frame."""
        if self.window is None and self.render_mode == "human":
            pygame.init()
            pygame.display.init()
            self.window = pygame.display.set_mode((self.window_size, self.window_size))
        if self.clock is None and self.render_mode == "human":
            self.clock = pygame.time.Clock()
        
        canvas = pygame.Surface((self.window_size, self.window_size))
        canvas.fill((255, 255, 255))
        
        # Draw board squares
        square_size = self.window_size // 8
        for row in range(8):
            for col in range(8):
                color = (240, 217, 181) if (row + col) % 2 == 0 else (181, 136, 99)
                pygame.draw.rect(
                    canvas, color,
                    pygame.Rect(col * square_size, row * square_size, square_size, square_size)
                )
                
                # Draw piece if present
                piece = self.board[row, col]
                if piece != '':
                    self._draw_piece(canvas, piece, row, col, square_size)
        
        if self.render_mode == "human":
            self.window.blit(canvas, canvas.get_rect())
            pygame.event.pump()
            pygame.display.update()
            self.clock.tick(self.metadata["render_fps"])
        else:
            return np.transpose(
                np.array(pygame.surfarray.pixels3d(canvas)), axes=(1, 0, 2)
            )
    
    def _draw_piece(self, canvas, piece, row, col, square_size):
        """Draw a piece on the canvas."""
        # Simple text representation for now
        font = pygame.font.Font(None, square_size // 2)
        color = (255, 255, 255) if piece.isupper() else (0, 0, 0)
        text = font.render(piece, True, color)
        text_rect = text.get_rect(center=(col * square_size + square_size // 2, 
                                         row * square_size + square_size // 2))
        canvas.blit(text, text_rect)
    
    def close(self):
        """Close the environment."""
        if self.window is not None:
            pygame.display.quit()
            pygame.quit()

# Register the environment
gym.register(
    id='Archess-v0',
    entry_point='archess_env:ArchessEnv',
    max_episode_steps=200,
)
