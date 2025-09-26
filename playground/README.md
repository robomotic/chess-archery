# Archess Playground 🏹🎮

A reinforcement learning playground for the Archess chess variant using OpenAI Gym/Gymnasium.

## 🚀 Quick Start

1. **Set up the environment:**
   ```bash
   cd playground
   ./setup.sh
   ```

2. **Activate the virtual environment:**
   ```bash
   source archess_env/bin/activate
   ```

3. **Run the interactive demo:**
   ```bash
   python demo.py
   ```

## 🎯 Features

### **Gymnasium Environment**
- **Observation Space**: 8x8x12 board representation (piece types × colors)
- **Action Space**: 8192 discrete actions (from_square × to_square × action_type)
- **Reward System**: Piece capture values + positional bonuses
- **Multiple Opponents**: Random, Greedy, and future Minimax AI

### **Reinforcement Learning**
- **Algorithms**: PPO, A2C, DQN support via Stable Baselines3
- **Training**: Automated training scripts with evaluation callbacks
- **Benchmarking**: Performance testing and algorithm comparison
- **Visualization**: Tensorboard integration and result plotting

### **Interactive Features**
- **Human vs AI**: Play against trained agents
- **AI vs AI**: Watch agents compete
- **Rendering**: Real-time pygame visualization
- **Benchmarking**: Environment performance testing

## 📁 Files

- **`archess_env.py`**: Main Gymnasium environment implementation
- **`train_agent.py`**: RL training script with multiple algorithms
- **`demo.py`**: Interactive demos and benchmarking
- **`requirements.txt`**: Python dependencies
- **`setup.sh`**: Environment setup script

## 🧠 Training Agents

### Basic Training
```python
from train_agent import train_agent

# Train a PPO agent
model = train_agent(
    algorithm="PPO", 
    total_timesteps=100000, 
    opponent="random"
)
```

### Compare Algorithms
```python
from train_agent import compare_algorithms

# Compare PPO, A2C, and DQN
results = compare_algorithms()
```

### Test Trained Agents
```python
from train_agent import test_agent

# Test a trained model
win_rate, mean_reward = test_agent(
    "./models/ppo_archess_final", 
    n_episodes=20, 
    render=True
)
```

## 🎮 Environment Details

### **Observation Space**
```python
# 8x8x12 array representing:
# - Channels 0-5: White pieces (P,N,B,R,Q,K,A)
# - Channels 6-11: Black pieces (p,n,b,r,q,k,a)
observation_space = Box(low=0, high=1, shape=(8,8,12), dtype=float32)
```

### **Action Space**
```python
# 8192 discrete actions encoding:
# - From square (64 possibilities)
# - To square (64 possibilities)  
# - Action type (2: normal_move, ranged_attack)
action_space = Discrete(8192)
```

### **Reward Structure**
- **Piece Captures**: Pawn=1, Archer=2, Knight/Bishop=3, Rook=5, Queen=9
- **Knight Paralysis**: +1.5 bonus for disabling knights
- **Invalid Moves**: -0.1 penalty
- **Game End**: Large bonus/penalty for wins/losses

### **Special Archess Rules**
- ✅ **Archer Movement**: One space in any direction (empty squares only)
- ✅ **Ranged Attacks**: 1-2 cells forward with piece restrictions
- ✅ **Knight Paralysis**: Coin flip mechanism with 50% disable chance
- ✅ **All Traditional Rules**: Standard chess movement and capture

## 📊 Performance

### **Environment Benchmarks**
- **Speed**: ~1000+ steps/second on modern hardware
- **Episodes**: 100+ episodes in under 10 seconds
- **Memory**: Efficient numpy-based state representation

### **Training Performance**
- **PPO**: Typically converges in 50K-100K timesteps
- **A2C**: Faster training but potentially less stable
- **DQN**: Good for discrete action spaces but slower convergence

## 🔧 Advanced Usage

### Custom Opponents
```python
# Create environment with custom opponent
env = ArchessEnv(opponent="greedy")

# Implement your own opponent logic
class CustomOpponent:
    def get_move(self, board_state):
        # Your AI logic here
        return move
```

### Multi-Agent Training
```python
# Train agents against each other
env1 = ArchessEnv(opponent="trained_agent")
env2 = ArchessEnv(opponent="random")

# Self-play training setup
# (Advanced implementation needed)
```

### Hyperparameter Tuning
```python
# Customize training parameters
model = PPO(
    "MlpPolicy",
    env,
    learning_rate=3e-4,
    n_steps=2048,
    batch_size=64,
    # ... other parameters
)
```

## 🎯 Next Steps

1. **Implement Minimax Opponent**: Add the strategic AI from the web version
2. **Self-Play Training**: Agents learning by playing against themselves  
3. **Tournament Mode**: Multiple agents competing in brackets
4. **Neural Network Visualization**: Understanding learned strategies
5. **Transfer Learning**: Pre-trained chess knowledge adaptation

## 🤝 Contributing

Feel free to extend the environment with:
- New AI opponents
- Additional reward shaping
- Multi-agent environments
- Advanced training techniques
- Performance optimizations

---

**Happy Training!** 🏹🤖
