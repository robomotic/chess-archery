#!/bin/bash

# Create virtual environment
echo "Creating Python virtual environment..."
python3 -m venv archess_env

# Activate virtual environment
echo "Activating virtual environment..."
source archess_env/bin/activate

# Upgrade pip
echo "Upgrading pip..."
pip install --upgrade pip

# Install dependencies
echo "Installing dependencies..."
pip install -r requirements.txt

echo "Setup complete! To activate the environment, run:"
echo "source archess_env/bin/activate"
