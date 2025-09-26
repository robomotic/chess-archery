"""
Test script to verify the Archess environment works correctly
"""

import sys
import os

# Add the playground directory to Python path
sys.path.append('/home/robomotic/DevOps/chessplus/playground')

def test_environment():
    """Test basic environment functionality."""
    try:
        from archess_env import ArchessEnv
        print("✅ Successfully imported ArchessEnv")
        
        # Create environment
        env = ArchessEnv(render_mode=None, opponent="random")
        print("✅ Successfully created environment")
        
        # Reset environment
        obs, info = env.reset()
        print(f"✅ Environment reset successful")
        print(f"   Observation shape: {obs.shape}")
        print(f"   Info: {info}")
        
        # Test random actions
        total_reward = 0
        steps = 0
        done = False
        
        while not done and steps < 10:
            action = env.action_space.sample()
            obs, reward, terminated, truncated, info = env.step(action)
            total_reward += reward
            steps += 1
            done = terminated or truncated
            
            if reward != 0:
                print(f"   Step {steps}: Action {action}, Reward {reward}")
        
        print(f"✅ Completed {steps} steps")
        print(f"   Total reward: {total_reward}")
        print(f"   Game over: {info.get('game_over', False)}")
        print(f"   Winner: {info.get('winner', 'None')}")
        
        env.close()
        print("✅ Environment closed successfully")
        
        return True
        
    except Exception as e:
        print(f"❌ Error testing environment: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_training_imports():
    """Test if training dependencies can be imported."""
    try:
        import gymnasium as gym
        print("✅ Gymnasium imported successfully")
        
        import stable_baselines3
        print("✅ Stable Baselines3 imported successfully")
        
        import numpy as np
        print("✅ NumPy imported successfully")
        
        import torch
        print("✅ PyTorch imported successfully")
        
        return True
        
    except Exception as e:
        print(f"❌ Error importing training dependencies: {e}")
        return False

def test_pygame():
    """Test pygame functionality."""
    try:
        import pygame
        pygame.init()
        print("✅ Pygame initialized successfully")
        
        # Test creating a surface (without display)
        surface = pygame.Surface((100, 100))
        print("✅ Pygame surface created successfully")
        
        pygame.quit()
        print("✅ Pygame quit successfully")
        
        return True
        
    except Exception as e:
        print(f"❌ Error testing pygame: {e}")
        return False

if __name__ == "__main__":
    print("🏹 Archess Environment Test Suite")
    print("=" * 50)
    
    success_count = 0
    total_tests = 3
    
    print("\n1. Testing Environment...")
    if test_environment():
        success_count += 1
    
    print("\n2. Testing Training Imports...")
    if test_training_imports():
        success_count += 1
    
    print("\n3. Testing Pygame...")
    if test_pygame():
        success_count += 1
    
    print("\n" + "=" * 50)
    print(f"Tests passed: {success_count}/{total_tests}")
    
    if success_count == total_tests:
        print("🎉 All tests passed! The environment is ready for use.")
        print("\n🚀 Next steps:")
        print("   - Run 'python demo.py' for interactive demos")
        print("   - Run 'python train_agent.py' to train RL agents")
    else:
        print("⚠️  Some tests failed. Check the error messages above.")
        sys.exit(1)
