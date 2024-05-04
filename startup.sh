#!/bin/bash

sessionName="testcaser"

tmux new-session -d -s $sessionName

# Discord Bot
tmux rename-window -t $sessionName:0 'discord-bot'
tmux send-keys -t $sessionName:discord-bot 'cd discordBot' C-m
tmux send-keys -t $sessionName:discord-bot 'clear && npm run start-bot' C-m

# Node Testing
tmux new-window -t $sessionName:1 -n "node-testing" 'node'

# Terminal
tmux new-window -t $sessionName:2 -n 'testing'

# =========================================
tmux set -g mouse on

tmux attach -t $sessionName:0
