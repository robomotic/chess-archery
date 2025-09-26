"""
Training script for Archess environment using Stable Baselines3
"""

import gymnasium as gym
import numpy as np
from stable_baselines3 import PPO, A2C, DQN
from stable_baselines3.common.env_util import make_vec_env
from stable_baselines3.common.evaluation import evaluate_policy
from stable_baselines3.common.callbacks import EvalCallback, StopTrainingOnRewardThreshold
import matplotlib.pyplot as plt
from archess_env import ArchessEnv

def create_archess_env():
    """Create and return an Archess environment."""
    return ArchessEnv(opponent="random")

def train_agent(algorithm="PPO", total_timesteps=100000, opponent="random"):
    """Train an RL agent to play Archess."""
    
    # Create environment
    env = make_vec_env(lambda: ArchessEnv(opponent=opponent), n_envs=4)
    
    # Create evaluation environment
    eval_env = ArchessEnv(opponent=opponent)
    
    # Initialize the agent
    if algorithm == "PPO":
        model = PPO(
            "MlpPolicy", 
            env, 
            verbose=1,
            learning_rate=3e-4,
            n_steps=2048,
            batch_size=64,
            n_epochs=10,
            gamma=0.99,
            gae_lambda=0.95,
            clip_range=0.2,
            ent_coef=0.01,
            tensorboard_log="./archess_tensorboard/"
        )
    elif algorithm == "A2C":
        model = A2C(
            "MlpPolicy",
            env,
            verbose=1,
            learning_rate=7e-4,
            n_steps=5,
            gamma=0.99,
            gae_lambda=1.0,
            ent_coef=0.01,
            tensorboard_log="./archess_tensorboard/"
        )
    elif algorithm == "DQN":
        model = DQN(
            "MlpPolicy",
            env,
            verbose=1,
            learning_rate=1e-4,
            buffer_size=50000,
            learning_starts=1000,
            batch_size=32,
            tau=1.0,
            gamma=0.99,
            train_freq=4,
            gradient_steps=1,
            target_update_interval=1000,
            exploration_fraction=0.1,
            exploration_initial_eps=1.0,
            exploration_final_eps=0.05,
            tensorboard_log="./archess_tensorboard/"
        )
    else:
        raise ValueError(f"Unknown algorithm: {algorithm}")
    
    # Create evaluation callback
    eval_callback = EvalCallback(
        eval_env,
        best_model_save_path=f'./models/{algorithm.lower()}_archess_best',
        log_path=f'./logs/{algorithm.lower()}_archess',
        eval_freq=10000,
        deterministic=True,
        render=False
    )
    
    print(f"Training {algorithm} agent against {opponent} opponent...")
    print(f"Total timesteps: {total_timesteps}")
    
    # Train the agent
    model.learn(
        total_timesteps=total_timesteps,
        callback=eval_callback,
        progress_bar=True
    )
    
    # Save the final model
    model.save(f"./models/{algorithm.lower()}_archess_final")
    
    # Evaluate the trained agent
    mean_reward, std_reward = evaluate_policy(
        model, eval_env, n_eval_episodes=10, deterministic=True
    )
    
    print(f"Mean reward: {mean_reward:.2f} +/- {std_reward:.2f}")
    
    return model

def test_agent(model_path, n_episodes=10, render=False):
    """Test a trained agent."""
    
    # Load the model
    if "ppo" in model_path.lower():
        model = PPO.load(model_path)
    elif "a2c" in model_path.lower():
        model = A2C.load(model_path)
    elif "dqn" in model_path.lower():
        model = DQN.load(model_path)
    else:
        raise ValueError("Cannot determine algorithm from model path")
    
    # Create test environment
    env = ArchessEnv(render_mode="human" if render else None, opponent="random")
    
    total_rewards = []
    wins = 0
    
    for episode in range(n_episodes):
        obs, info = env.reset()
        episode_reward = 0
        done = False
        
        while not done:
            action, _ = model.predict(obs, deterministic=True)
            obs, reward, terminated, truncated, info = env.step(action)
            episode_reward += reward
            done = terminated or truncated
            
            if render:
                env.render()
        
        total_rewards.append(episode_reward)
        if info.get('winner') == 'white':  # Assuming agent plays white
            wins += 1
        
        print(f"Episode {episode + 1}: Reward = {episode_reward:.2f}, Winner = {info.get('winner', 'None')}")
    
    win_rate = wins / n_episodes
    mean_reward = np.mean(total_rewards)
    
    print(f"\nTest Results over {n_episodes} episodes:")
    print(f"Win rate: {win_rate:.2%}")
    print(f"Mean reward: {mean_reward:.2f}")
    print(f"Reward std: {np.std(total_rewards):.2f}")
    
    env.close()
    return win_rate, mean_reward

def compare_algorithms():
    """Compare different RL algorithms on Archess."""
    algorithms = ["PPO", "A2C", "DQN"]
    results = {}
    
    for alg in algorithms:
        print(f"\n{'='*50}")
        print(f"Training {alg}")
        print(f"{'='*50}")
        
        try:
            model = train_agent(algorithm=alg, total_timesteps=50000)
            
            # Test the trained model
            win_rate, mean_reward = test_agent(
                f"./models/{alg.lower()}_archess_final", 
                n_episodes=20
            )
            
            results[alg] = {
                'win_rate': win_rate,
                'mean_reward': mean_reward
            }
            
        except Exception as e:
            print(f"Error training {alg}: {e}")
            results[alg] = {'win_rate': 0, 'mean_reward': 0}
    
    # Plot results
    algorithms = list(results.keys())
    win_rates = [results[alg]['win_rate'] for alg in algorithms]
    mean_rewards = [results[alg]['mean_reward'] for alg in algorithms]
    
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 5))
    
    ax1.bar(algorithms, win_rates)
    ax1.set_ylabel('Win Rate')
    ax1.set_title('Win Rate by Algorithm')
    ax1.set_ylim(0, 1)
    
    ax2.bar(algorithms, mean_rewards)
    ax2.set_ylabel('Mean Reward')
    ax2.set_title('Mean Reward by Algorithm')
    
    plt.tight_layout()
    plt.savefig('./results/algorithm_comparison.png')
    plt.show()
    
    return results

if __name__ == "__main__":
    import os
    
    # Create directories
    os.makedirs("./models", exist_ok=True)
    os.makedirs("./logs", exist_ok=True)
    os.makedirs("./results", exist_ok=True)
    
    # Train a PPO agent
    print("Training PPO agent...")
    model = train_agent(algorithm="PPO", total_timesteps=100000, opponent="random")
    
    # Test the trained agent
    print("\nTesting trained agent...")
    test_agent("./models/ppo_archess_final", n_episodes=10, render=False)
    
    # Uncomment to compare algorithms
    # print("\nComparing algorithms...")
    # compare_algorithms()
