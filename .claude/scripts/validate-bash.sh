#!/bin/bash

# Claude Code Bash Command Validator
# Prevents token waste from scanning large directories

# Read the command from stdin
COMMAND=$(cat | jq -r '.tool_input.command' 2>/dev/null || echo "")

# If jq fails, read directly (fallback)
if [ -z "$COMMAND" ]; then
    COMMAND=$(cat)
fi

# Blocked patterns - directories that waste tokens
BLOCKED_PATTERNS=(
    "node_modules"
    "\.env"
    "__pycache__"
    "\.git/"
    "dist/"
    "build/"
    "\.next/"
    "coverage/"
    "\.firebase/"
    "\.cache/"
    "tmp/"
    "temp/"
    "\.vscode/"
    "\.idea/"
)

# Firebase-specific blocked patterns
FIREBASE_BLOCKED=(
    "functions/node_modules"
    "functions/lib/"
    "\.firebaserc"
    "firebase-debug\.log"
)

# Combine all patterns
ALL_BLOCKED=$(IFS='|'; echo "${BLOCKED_PATTERNS[*]}|${FIREBASE_BLOCKED[*]}")

# Check if command contains blocked patterns
if echo "$COMMAND" | grep -qE "$ALL_BLOCKED"; then
    echo "🚨 ERROR: Blocked directory pattern detected in bash command" >&2
    echo "Command: $COMMAND" >&2
    echo "This could consume excessive tokens by scanning large directories" >&2
    echo "Suggestion: Use more specific paths or exclude these directories" >&2
    exit 1
fi

# Additional checks for risky commands
if echo "$COMMAND" | grep -qE "find \. |grep -r \.|rg \.|ag \."; then
    if ! echo "$COMMAND" | grep -qE "\-\-exclude|\-\-ignore|\-\-exclude\-dir"; then
        echo "⚠️  WARNING: Broad search command without exclusions detected" >&2
        echo "Command: $COMMAND" >&2
        echo "Consider adding --exclude-dir=node_modules or similar flags" >&2
        echo "Proceeding but this may consume many tokens..." >&2
    fi
fi

# Log safe commands for monitoring
echo "✅ Bash command validated: $(echo "$COMMAND" | cut -c1-50)..." >&2

exit 0