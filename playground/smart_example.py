"""
Better example with valid action sampling
"""

import sys
sys.path.append('/home/robomotic/DevOps/chessplus/playground')

from archess_env import ArchessEnv
from utils import sample_valid_action, action_to_string, print_board
import numpy as np

def smart_example():
    print("🏹 Archess Environment - Smart Sampling Example")
    print("=" * 50)
    
    # Create environment
    env = ArchessEnv(opponent="greedy")
    print("Environment created successfully!")
    
    # Run a game with valid moves
    print(f"\n📍 Playing a game with valid moves")
    
    obs, info = env.reset()
    print(f"Game started. Current player: {info['current_player']}")
    
    total_reward = 0
    steps = 0
    
    while not env.game_over and steps < 100:
        # Sample a valid action instead of random
        action = sample_valid_action(env)
        
        # Show the move being made
        move_description = action_to_string(env, action)
        print(f"Step {steps + 1}: {env.current_player} plays {move_description}")
        
        # Take the action
        obs, reward, terminated, truncated, info = env.step(action)
        total_reward += reward
        steps += 1
        
        # Print significant events
        if reward > 0:
            print(f"  🎯 Positive reward: {reward:.2f}")
        elif reward < -0.05:
            print(f"  ⚠️  Negative reward: {reward:.2f}")
        
        # Show board state occasionally
        if steps % 10 == 0:
            print(f"\n--- Board after {steps} moves ---")
            print_board(env)
            print()
        
        if terminated or truncated:
            print(f"\n🏁 Game ended after {steps} steps")
            print(f"   Winner: {info.get('winner', 'None')}")
            print("\n--- Final board state ---")
            print_board(env)
            break
    
    print(f"\nGame summary:")
    print(f"  - Steps: {steps}")
    print(f"  - Total reward: {total_reward:.2f}")
    print(f"  - Game completed: {'Yes' if env.game_over else 'No (time limit)'}")
    
    env.close()
    print("\n✅ Smart example completed successfully!")

if __name__ == "__main__":
    smart_example()
