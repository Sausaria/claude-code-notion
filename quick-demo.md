# Quick Demo Commands

Run these commands to see claude-code-notion in action:

## Setup
```bash
export NOTION_API_KEY="your_actual_key"
export NOTION_DATABASE_ID="your_actual_db_id"
```

## 1. Test Health Check
```bash
npx claude-code-notion health --json
```

## 2. Search for Tasks
```bash
npx claude-code-notion search "test" --json
```

## 3. Update a Task (Dry Run First)
```bash
# Preview what would happen
npx claude-code-notion update-status "Your Task Name" "In Progress" --dry-run --json

# Actually update
npx claude-code-notion update-status "Your Task Name" "In Progress" --json
```

## 4. List All Statuses
```bash
npx claude-code-notion statuses --json
```

## 5. Get Statistics
```bash
npx claude-code-notion stats --json
```

## 6. Export to CSV
```bash
npx claude-code-notion export csv > tasks.csv
```

## Recording Your Own Demo

To record for a GIF:

1. **Option A: Use Terminalizer (installed)**
   ```bash
   terminalizer record my-demo
   # Run your commands
   # Press Ctrl+D when done
   terminalizer render my-demo -o demo.gif
   ```

2. **Option B: Use macOS Screen Recording**
   - Press `Cmd + Shift + 5`
   - Select portion of screen
   - Record your terminal
   - Convert to GIF at https://ezgif.com/video-to-gif

3. **Option C: Use asciinema**
   ```bash
   brew install asciinema
   asciinema rec demo.cast
   # Run commands
   # Ctrl+D to stop
   ```

## Sample Recording Script

```bash
clear
echo "🚀 Claude Code Notion Demo"
echo ""
sleep 1

echo "$ npx claude-code-notion health --json"
npx claude-code-notion health --json
sleep 2

echo ""
echo "$ npx claude-code-notion search 'API' --json"
npx claude-code-notion search "API" --json
sleep 2

echo ""
echo "✅ Enterprise-ready Notion automation!"
```