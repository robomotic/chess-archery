"""
Interactive demo for the Archess environment
"""

import numpy as np
import pygame
import sys
from archess_env import ArchessEnv

def human_vs_ai_demo():
    """Interactive demo where human plays against AI."""
    print("Welcome to Archess!")
    print("You are playing as White (uppercase pieces)")
    print("Click on a piece to select it, then click on a destination square")
    print("Press ESC to quit")
    
    env = ArchessEnv(render_mode="human", opponent="greedy")
    obs, info = env.reset()
    
    pygame.init()
    pygame.font.init()
    font = pygame.font.Font(None, 24)
    
    running = True
    selected_square = None
    
    while running:
        env.render()
        
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            elif event.type == pygame.KEYDOWN:
                if event.key == pygame.K_ESCAPE:
                    running = False
            elif event.type == pygame.MOUSEBUTTONDOWN:
                if event.button == 1:  # Left click
                    mouse_pos = pygame.mouse.get_pos()
                    col = mouse_pos[0] // (env.window_size // 8)
                    row = mouse_pos[1] // (env.window_size // 8)
                    
                    if 0 <= row < 8 and 0 <= col < 8:
                        if selected_square is None:
                            # Select piece
                            piece = env.board[row, col]
                            if piece != '' and piece.isupper():  # White piece
                                selected_square = (row, col)
                                print(f"Selected {piece} at {chr(65+col)}{8-row}")
                        else:
                            # Make move
                            from_square = selected_square
                            to_square = (row, col)
                            
                            # Try to encode and execute the action
                            action = env._encode_action(from_square, to_square, 0)
                            
                            obs, reward, terminated, truncated, info = env.step(action)
                            
                            if reward >= 0:  # Valid move
                                print(f"Move: {chr(65+selected_square[1])}{8-selected_square[0]} to {chr(65+col)}{8-row}")
                                print(f"Reward: {reward}")
                                
                                if terminated:
                                    print(f"Game Over! Winner: {info.get('winner', 'None')}")
                                    running = False
                            else:
                                print("Invalid move!")
                            
                            selected_square = None
        
        if env.current_player == 'black' and not env.game_over:
            pygame.time.wait(1000)  # Brief pause for AI move
    
    env.close()
    pygame.quit()

def ai_vs_ai_demo():
    """Demo where two AIs play against each other."""
    print("AI vs AI Demo")
    print("Press any key to advance turns, ESC to quit")
    
    env = ArchessEnv(render_mode="human", opponent="greedy")
    obs, info = env.reset()
    
    pygame.init()
    
    running = True
    move_count = 0
    
    while running and not env.game_over:
        env.render()
        
        # Get all valid actions for current player
        valid_actions = []
        for from_row in range(8):
            for from_col in range(8):
                piece = env.board[from_row, from_col]
                if piece != '' and ((piece.isupper() and env.current_player == 'white') or 
                                   (piece.islower() and env.current_player == 'black')):
                    possible_moves = env._get_possible_moves((from_row, from_col))
                    for to_row, to_col in possible_moves:
                        action = env._encode_action((from_row, from_col), (to_row, to_col), 0)
                        valid_actions.append(action)
        
        if valid_actions:
            # Random AI move
            action = np.random.choice(valid_actions)
            from_square, to_square, _ = env._decode_action(action)
            
            print(f"Move {move_count + 1}: {env.current_player} plays "
                  f"{chr(65+from_square[1])}{8-from_square[0]} to "
                  f"{chr(65+to_square[1])}{8-to_square[0]}")
            
            obs, reward, terminated, truncated, info = env.step(action)
            move_count += 1
            
            if terminated:
                print(f"Game Over! Winner: {info.get('winner', 'None')}")
                break
        
        # Handle events
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            elif event.type == pygame.KEYDOWN:
                if event.key == pygame.K_ESCAPE:
                    running = False
                else:
                    break  # Advance to next move
        else:
            pygame.time.wait(1500)  # Auto-advance after 1.5 seconds
            continue
        break
    
    env.close()
    pygame.quit()

def benchmark_environment():
    """Benchmark the environment performance."""
    print("Benchmarking Archess Environment...")
    
    env = ArchessEnv(opponent="random")
    
    # Test random actions
    total_steps = 0
    total_episodes = 100
    total_rewards = []
    
    import time
    start_time = time.time()
    
    for episode in range(total_episodes):
        obs, info = env.reset()
        episode_reward = 0
        steps = 0
        done = False
        
        while not done and steps < 200:  # Limit episode length
            action = env.action_space.sample()
            obs, reward, terminated, truncated, info = env.step(action)
            episode_reward += reward
            steps += 1
            done = terminated or truncated
        
        total_steps += steps
        total_rewards.append(episode_reward)
    
    end_time = time.time()
    
    print(f"Completed {total_episodes} episodes in {end_time - start_time:.2f} seconds")
    print(f"Average steps per episode: {total_steps / total_episodes:.1f}")
    print(f"Steps per second: {total_steps / (end_time - start_time):.1f}")
    print(f"Average reward: {np.mean(total_rewards):.2f} ± {np.std(total_rewards):.2f}")
    
    env.close()

if __name__ == "__main__":
    print("Archess Environment Demo")
    print("1. Human vs AI")
    print("2. AI vs AI") 
    print("3. Benchmark")
    
    choice = input("Enter your choice (1-3): ").strip()
    
    if choice == "1":
        human_vs_ai_demo()
    elif choice == "2":
        ai_vs_ai_demo()
    elif choice == "3":
        benchmark_environment()
    else:
        print("Invalid choice. Running human vs AI demo...")
        human_vs_ai_demo()
