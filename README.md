# Archess ♔

A modern chess variant that introduces the **Archer** piece, adding new tactical dimensions to the classic game.

## 🎮 Play Online

Open `docs/chess.html` in your web browser to play Archess immediately - no installation required!

The game is also ready for GitHub Pages deployment with all graphics properly configured.

## 🏹 Game Overview

Archess is played on a standard 8x8 chessboard with all traditional chess pieces, plus the addition of **Archer** pieces that replace specific pawns and introduce ranged combat mechanics.

### Key Features

- **Human vs Human** gameplay
- **Multiple AI Opponents**: Random, Greedy, and strategic Minimax AI
- **Enhanced Move History** with detailed piece notation
- **Touch-friendly** interface for mobile devices
- **Visual move highlighting** with color-coded attack ranges
- **Drag & Drop** support for piece movement
- **Check/Checkmate detection**
- **Performance optimized** AI with time controls
- **Responsive design** that works on all screen sizes

## 🏹 The Archer Piece

### Starting Position
- **White Archers**: Replace pawns on B2 and G2
- **Black Archers**: Replace pawns on B7 and G7

### Movement Rules
Archers can move **one space in any direction** (horizontal, vertical, or diagonal), but **only to empty squares**. They cannot capture pieces by moving into them.

### Attack Rules
Archers perform **ranged attacks** on enemy pieces that are **1 or 2 cells away directly in front** of them:

- **Valid Targets**: Pawns, Bishops, Kings, Knights, and other Archers
- **Attack Range**: 1 or 2 cells directly forward (vertical only)
- **No Movement**: The Archer stays in its original position after attacking
- **Visual Indicator**: Ranged attack targets are highlighted in red

### Special Rule: Knight Paralysis 🎯
When an Archer attacks a Knight, a coin is flipped automatically:
- **Heads**: The Knight becomes paralyzed and cannot move for the rest of the game
- **Tails**: The Knight takes no damage and can still move normally

Paralyzed Knights appear grayed out and cannot be selected or moved.

### Defense
Archers can be captured by any piece, including other Archers, following standard chess capture rules.

## 🎮 How to Play

1. **Select a Piece**: Click or tap on one of your pieces to select it
2. **View Possible Moves**: 
   - Green highlights show normal moves
   - Red highlights show ranged attack targets
3. **Make Your Move**: Click or tap on a highlighted square to move or attack
4. **Turn-Based Play**: Players alternate turns (White goes first)
5. **Game Modes**: Select from Human vs Human or three AI difficulty levels
6. **Move History**: Review detailed notation of all moves including piece types and special actions

## 🧠 AI Opponents

Archess features multiple AI difficulty levels, each with unique strategies:

### **Random AI** 🎲
- **Strategy**: Opportunistic with random movement
- **Behavior**: 
  - Prioritizes attacks when available
  - Makes random moves that approach opponent pieces
  - Avoids moves that put its own king in check
- **Difficulty**: Beginner-friendly

### **Greedy AI** 🎯  
- **Strategy**: Material-focused tactical play
- **Behavior**:
  - Always captures the highest-value piece available
  - Uses standard chess piece values (Queen=9, Rook=5, etc.)
  - Falls back to positional play when no captures exist
- **Difficulty**: Intermediate challenge

### **Minimax AI** 🧠
- **Strategy**: Advanced strategic planning with lookahead
- **Behavior**:
  - Thinks 2-4 moves ahead using minimax algorithm
  - Evaluates positions based on material, position, king safety, and mobility
  - Uses alpha-beta pruning for optimal performance
  - Time-controlled computation (under 150ms per move)
- **Difficulty**: Advanced strategic opponent

All AI modes respect Archess special rules including archer ranged attacks and knight paralysis mechanics.

## 🎯 Strategy Tips

- **Archer Positioning**: Place Archers where they can control key forward squares
- **Knight Protection**: Be cautious when attacking Knights - the coin flip adds uncertainty
- **Ranged Pressure**: Use Archers to apply pressure without exposing them to immediate capture
- **King Safety**: Remember that Archers can attack Kings from a distance

## 🔧 Technical Details

- **Pure HTML/CSS/JavaScript** - no dependencies required
- **Responsive design** with mobile touch support
- **Local gameplay** - no server required
- **Modern browser compatibility**

## 📜 License

### Source Code (Apache License 2.0)

Copyright (c) 2025 Paolo Di Prodi

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at:

[http://www.apache.org/licenses/LICENSE-2.0](http://www.apache.org/licenses/LICENSE-2.0)

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

### Game Rules and Documentation (Creative Commons Attribution-NonCommercial 4.0)

Chess Variant Rules and Documentation © 2025 Paolo Di Prodi

This work is licensed under the Creative Commons Attribution-NonCommercial 4.0 International License.
To view a copy of this license, visit:

[http://creativecommons.org/licenses/by-nc/4.0/](http://creativecommons.org/licenses/by-nc/4.0/)

You are free to:

* **Share** — copy and redistribute the material in any medium or format.
* **Adapt** — remix, transform, and build upon the material for non-commercial purposes only.

Under the following terms:

* **Attribution** — You must give appropriate credit to the original author (Paolo Di Prodi),
  provide a link to the license, and indicate if changes were made.
* **NonCommercial** — You may not use the material for commercial purposes without explicit permission from the author.

## 🚀 Getting Started

1. Clone or download this repository
2. Open `docs/chess.html` in any modern web browser
3. Start playing immediately!

No build process, no installation, no dependencies - just pure chess fun with a tactical twist!

---

**Enjoy Archess!** 🏹♔
