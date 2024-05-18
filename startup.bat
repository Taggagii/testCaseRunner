"C:\Program Files\Docker\Docker\Docker Desktop.exe"

cd discordBot
wsl -- tmux kill-session -t 'testcaser'
wsl -- tmux new-session -d -s 'testcaser'
wsl -- tmux send-keys -t testcaser 'npm run start-all' C-m
