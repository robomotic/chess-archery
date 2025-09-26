"""
Simple example demonstrating the Archess environment
"""

import sys
sys.path.append('/home/robomotic/DevOps/chessplus/playground')

from archess_env import ArchessEnv
import numpy as np

def main():
    print("🏹 Archess Environment Example")
    print("=" * 40)
    
    # Create environment
    env = ArchessEnv(opponent="random")
    print("Environment created successfully!")
    
    # Run a few episodes
    for episode in range(3):
        print(f"\n📍 Episode {episode + 1}")
        
        obs, info = env.reset()
        print(f"Reset complete. Current player: {info['current_player']}")
        
        total_reward = 0
        steps = 0
        done = False
        
        while not done and steps < 50:  # Limit steps per episode
            # Sample a random action
            action = env.action_space.sample()
            
            # Take the action
            obs, reward, terminated, truncated, info = env.step(action)
            total_reward += reward
            steps += 1
            done = terminated or truncated
            
            # Print significant events
            if reward > 0:
                print(f"  🎯 Step {steps}: Positive reward {reward:.2f}")
            elif reward < -0.05:  # More than just invalid move penalty
                print(f"  ⚠️  Step {steps}: Negative reward {reward:.2f}")
            
            if done:
                print(f"  🏁 Game ended after {steps} steps")
                print(f"     Winner: {info.get('winner', 'None')}")
                break
        
        print(f"Episode summary:")
        print(f"  - Steps: {steps}")
        print(f"  - Total reward: {total_reward:.2f}")
        print(f"  - Final state: {'Game Over' if done else 'Time Limit'}")
    
    env.close()
    print("\n✅ Example completed successfully!")

if __name__ == "__main__":
    main()
