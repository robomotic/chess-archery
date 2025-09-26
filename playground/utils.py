"""
Utilities for the Archess environment
"""

import numpy as np
from typing import List, Tuple

def get_valid_actions(env) -> List[int]:
    """Get all valid actions for the current player."""
    valid_actions = []
    
    for from_row in range(8):
        for from_col in range(8):
            piece = env.board[from_row, from_col]
            if piece != '':
                # Check if piece belongs to current player
                is_white_piece = piece.isupper()
                if (env.current_player == 'white') == is_white_piece:
                    # Check if this piece is disabled (for knights)
                    piece_key = f"{from_row}-{from_col}"
                    if piece.lower() == 'n' and (from_row, from_col) in env.disabled_knights:
                        continue
                    
                    # Get possible moves for this piece
                    possible_moves = env._get_possible_moves((from_row, from_col))
                    
                    for to_row, to_col in possible_moves:
                        # Check if this is a ranged attack
                        is_ranged = (piece.lower() == 'a' and 
                                   abs(to_row - from_row) <= 2 and 
                                   to_col == from_col and 
                                   env.board[to_row, to_col] != '')
                        
                        action_type = 1 if is_ranged else 0
                        action = env._encode_action((from_row, from_col), (to_row, to_col), action_type)
                        valid_actions.append(action)
    
    return valid_actions

def sample_valid_action(env) -> int:
    """Sample a valid action for the current player."""
    valid_actions = get_valid_actions(env)
    if valid_actions:
        return np.random.choice(valid_actions)
    else:
        # Fallback to random action if no valid moves found
        return env.action_space.sample()

def action_to_string(env, action: int) -> str:
    """Convert action to human-readable string."""
    from_square, to_square, action_type = env._decode_action(action)
    from_row, from_col = from_square
    to_row, to_col = to_square
    
    piece = env.board[from_row, from_col] if env.board[from_row, from_col] != '' else '?'
    
    from_notation = f"{chr(65 + from_col)}{8 - from_row}"
    to_notation = f"{chr(65 + to_col)}{8 - to_row}"
    
    action_str = "ranged_attack" if action_type == 1 else "move"
    
    return f"{piece}{from_notation}->{to_notation} ({action_str})"

def print_board(env):
    """Print a visual representation of the board."""
    print("   A B C D E F G H")
    print("  ┌─────────────────┐")
    
    for row in range(8):
        row_str = f"{8-row} │"
        for col in range(8):
            piece = env.board[row, col]
            if piece == '':
                piece = '·'
            
            # Mark disabled knights
            if (row, col) in env.disabled_knights:
                piece = f"({piece})"
            
            row_str += f" {piece}"
        
        row_str += f" │ {8-row}"
        print(row_str)
    
    print("  └─────────────────┘")
    print("   A B C D E F G H")
    print(f"Current player: {env.current_player}")
    print(f"Disabled knights: {list(env.disabled_knights)}")

def play_interactive_game():
    """Play an interactive game with valid action sampling."""
    import sys
    sys.path.append('/home/robomotic/DevOps/chessplus/playground')
    from archess_env import ArchessEnv
    
    env = ArchessEnv(opponent="greedy")
    obs, info = env.reset()
    
    print("🏹 Interactive Archess Game")
    print("You are White (uppercase pieces)")
    print("Type 'quit' to exit, 'help' for commands")
    print("=" * 50)
    
    while not env.game_over:
        print_board(env)
        
        if env.current_player == 'white':
            # Human player
            print(f"\nYour turn! Valid actions: {len(get_valid_actions(env))}")
            
            while True:
                command = input("Enter command (or 'help'): ").strip().lower()
                
                if command == 'quit':
                    print("Thanks for playing!")
                    return
                elif command == 'help':
                    print("Commands:")
                    print("  'random' - Make a random valid move")
                    print("  'show' - Show valid moves")
                    print("  'quit' - Exit game")
                    continue
                elif command == 'random':
                    action = sample_valid_action(env)
                    break
                elif command == 'show':
                    valid_actions = get_valid_actions(env)[:10]  # Show first 10
                    print("Valid moves (first 10):")
                    for i, action in enumerate(valid_actions):
                        print(f"  {i+1}. {action_to_string(env, action)}")
                    continue
                else:
                    print("Unknown command. Type 'help' for available commands.")
                    continue
            
            print(f"Making move: {action_to_string(env, action)}")
        else:
            # AI opponent
            action = sample_valid_action(env)
            print(f"AI plays: {action_to_string(env, action)}")
        
        # Execute the action
        obs, reward, terminated, truncated, info = env.step(action)
        
        if reward != 0:
            print(f"Reward: {reward}")
        
        if terminated or truncated:
            print_board(env)
            print(f"\n🏁 Game Over!")
            print(f"Winner: {info.get('winner', 'Draw')}")
            break
        
        print("-" * 30)
    
    env.close()

if __name__ == "__main__":
    play_interactive_game()
