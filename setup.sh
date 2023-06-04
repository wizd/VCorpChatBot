#!/bin/bash

# Install global dependencies
npm install -g typescript ts-node

# Install local dependencies
npm install

# Compile TypeScript
tsc

# Check if .env file exists, if not, copy .env.example to .env and open it with a text editor
if [ -f ".env" ]; then
    echo ".env file already exists, no need to copy"
else
    cp .env.example .env
    nano .env
fi