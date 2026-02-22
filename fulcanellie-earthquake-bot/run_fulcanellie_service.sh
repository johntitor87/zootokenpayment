#!/bin/bash

# run_fulcanellie_service.sh - Script to run Fulcanellie character continuously
# 
# Usage: ./run_fulcanellie_service.sh
#
# This script will run the Fulcanellie character program indefinitely,
# with error handling, logging, and automatic restart capability.

# Set up logging directory and file (relative to script location)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="${SCRIPT_DIR}/logs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/fulcanellie_service_$(date +"%Y%m%d").log"

# Rotate logs if they get too large (keep logs for 7 days)
find "$LOG_DIR" -name "fulcanellie_service_*.log" -mtime +7 -delete

# Function to log messages
log() {
    local timestamp=$(date +"%Y-%m-%d %H:%M:%S")
    echo "[$timestamp] $1" | tee -a "$LOG_FILE"
}

# Determine the correct program to run
find_and_run_program() {
    local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    
    # Set up Node.js environment
    export NODE_PATH="$script_dir/node_modules:$NODE_PATH"
    export PATH="$script_dir/node_modules/.bin:$PATH"
    
    # Load environment variables from .env file if it exists
    if [ -f "$script_dir/.env" ]; then
        log "Loading environment variables from .env file"
        set -a
        source "$script_dir/.env"
        set +a
    fi
    
    # Try to run using npm scripts first (recommended approach)
    if [ -f "$script_dir/package.json" ]; then
        if command -v npm &> /dev/null; then
            log "Running Node.js application via npm script"
            cd "$script_dir" && npm start >> "$LOG_FILE" 2>&1
            return $?
        elif command -v node &> /dev/null; then
            # Try to determine the main entry point from package.json
            if [ -f "$script_dir/dist/index.js" ]; then
                log "Running Node.js application from dist/index.js"
                cd "$script_dir" && node dist/index.js >> "$LOG_FILE" 2>&1
                return $?
            elif [ -f "$script_dir/src/index.js" ] || [ -f "$script_dir/src/index.ts" ]; then
                # Check if we need to run TypeScript
                if [ -f "$script_dir/src/index.ts" ] && command -v npx &> /dev/null; then
                    log "Running TypeScript application from src/index.ts"
                    cd "$script_dir" && npx ts-node src/index.ts >> "$LOG_FILE" 2>&1
                    return $?
                elif [ -f "$script_dir/src/index.js" ]; then
                    log "Running JavaScript application from src/index.js"
                    cd "$script_dir" && node src/index.js >> "$LOG_FILE" 2>&1
                    return $?
                fi
            elif [ -f "$script_dir/index.js" ]; then
                log "Running Node.js application from index.js"
                cd "$script_dir" && node index.js >> "$LOG_FILE" 2>&1
                return $?
            fi
        fi
    fi
    
    # Fallback to other common program types
    if [ -f "$script_dir/fulcanellie.py" ]; then
        log "Running Python script: fulcanellie.py"
        python3 "$script_dir/fulcanellie.py" >> "$LOG_FILE" 2>&1
        return $?
    elif [ -f "$script_dir/fulcanellie" ]; then
        log "Running executable: fulcanellie"
        "$script_dir/fulcanellie" >> "$LOG_FILE" 2>&1
        return $?
    elif [ -f "$script_dir/main.py" ]; then
        log "Running Python script: main.py"
        python3 "$script_dir/main.py" >> "$LOG_FILE" 2>&1
        return $?
    else
        log "ERROR: Could not find Fulcanellie executable or script. Please update this script with the correct command."
        log "Directory contents: $(ls -la $script_dir)"
        return 1
    fi
}

# Trap signals to clean up when the script is terminated
trap 'log "Service stopping due to signal received."; exit 0' SIGINT SIGTERM

# Track metrics
start_date=$(date +"%Y-%m-%d")
total_runs=0
total_crashes=0

log "===== STARTING FULCANELLIE SERVICE ====="
log "Service started at: $(date)"
log "Logs will be saved to: $LOG_FILE"

# Main loop - run indefinitely
while true; do
    total_runs=$((total_runs + 1))
    current_date=$(date +"%Y-%m-%d")
    
    # Rotate log file if date has changed
    if [ "$current_date" != "$start_date" ]; then
        start_date=$current_date
        LOG_FILE="$LOG_DIR/fulcanellie_service_$(date +"%Y%m%d").log"
        log "===== NEW DAY - ROTATING LOG FILE ====="
        log "Service continuing at: $(date)"
        log "Total runs so far: $total_runs, Crashes: $total_crashes"
    fi
    
    # Run the program
    log "Starting Fulcanellie character (run #$total_runs)"
    
    start_time=$(date +%s)
    find_and_run_program
    exit_code=$?
    end_time=$(date +%s)
    runtime=$((end_time - start_time))
    
    # Handle results
    if [ $exit_code -eq 0 ]; then
        log "Fulcanellie character completed successfully after ${runtime} seconds"
    else
        total_crashes=$((total_crashes + 1))
        log "ERROR: Fulcanellie character crashed with exit code $exit_code after ${runtime} seconds"
        log "This is crash #$total_crashes out of $total_runs total runs"
        
        # If it crashed too quickly, add a longer delay to prevent rapid restart cycles
        if [ $runtime -lt 10 ]; then
            log "Program crashed too quickly, waiting 60 seconds before restart..."
            sleep 60
        fi
    fi
    
    # Add a small delay to prevent resource exhaustion
    log "Waiting 5 seconds before next run..."
    sleep 5
    
    # Every 100 runs, print a status summary
    if [ $((total_runs % 100)) -eq 0 ]; then
        log "===== STATUS SUMMARY ====="
        log "Total runs: $total_runs"
        log "Total crashes: $total_crashes"
        log "Crash rate: $(echo "scale=2; $total_crashes * 100 / $total_runs" | bc)%"
        log "Service running since: $(head -n 3 "$LOG_FILE" | grep "Service started" | cut -d ":" -f 2-)"
    fi
done

