#!/bin/bash

##############################################################################
# Manual Testing Helper Script for Echo Dialer
# This script helps prepare the environment and guide through manual testing
##############################################################################

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║         Echo Dialer - Manual Testing Assistant              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Function to print colored output
print_status() {
    case $1 in
        "success")
            echo -e "${GREEN}✓${NC} $2"
            ;;
        "error")
            echo -e "${RED}✗${NC} $2"
            ;;
        "warning")
            echo -e "${YELLOW}⚠${NC} $2"
            ;;
        "info")
            echo -e "${BLUE}ℹ${NC} $2"
            ;;
    esac
}

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 1: Checking Prerequisites"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if command_exists node; then
    NODE_VERSION=$(node --version)
    print_status "success" "Node.js installed: $NODE_VERSION"
else
    print_status "error" "Node.js not found. Please install Node.js 18+"
    exit 1
fi

if command_exists npm; then
    NPM_VERSION=$(npm --version)
    print_status "success" "npm installed: $NPM_VERSION"
else
    print_status "error" "npm not found"
    exit 1
fi

# Check for .env file
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 2: Checking Environment Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -f .env ]; then
    print_status "success" ".env file found"
    
    # Check for required variables
    if grep -q "VITE_SUPABASE_URL" .env && [ -n "$(grep VITE_SUPABASE_URL .env | cut -d '=' -f2)" ]; then
        print_status "success" "VITE_SUPABASE_URL configured"
    else
        print_status "warning" "VITE_SUPABASE_URL not configured"
    fi
    
    if grep -q "VITE_SUPABASE_ANON_KEY" .env && [ -n "$(grep VITE_SUPABASE_ANON_KEY .env | cut -d '=' -f2)" ]; then
        print_status "success" "VITE_SUPABASE_ANON_KEY configured"
    else
        print_status "warning" "VITE_SUPABASE_ANON_KEY not configured"
    fi
    
    if grep -q "PIPEDRIVE_API_KEY" .env && [ -n "$(grep PIPEDRIVE_API_KEY .env | cut -d '=' -f2)" ]; then
        print_status "success" "PIPEDRIVE_API_KEY configured"
    else
        print_status "warning" "PIPEDRIVE_API_KEY not configured (backend only)"
    fi
else
    print_status "error" ".env file not found"
    print_status "info" "Creating .env from .env.example..."
    cp .env.example .env
    print_status "warning" "Please edit .env file with your credentials"
    echo ""
    echo "Required variables:"
    echo "  - VITE_SUPABASE_URL"
    echo "  - VITE_SUPABASE_ANON_KEY"
    echo "  - PIPEDRIVE_API_KEY (for backend)"
    echo "  - OPENAI_API_KEY (for AI features)"
    echo ""
    read -p "Press Enter after configuring .env file..."
fi

# Check node_modules
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 3: Checking Dependencies"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -d "node_modules" ]; then
    print_status "success" "Dependencies installed"
else
    print_status "warning" "Dependencies not installed"
    read -p "Install dependencies now? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "info" "Installing dependencies..."
        npm install || print_status "error" "Failed to install dependencies"
    fi
fi

# Display test menu
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 4: Select Testing Mode"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Available testing options:"
echo ""
echo "  1) Start development server (npm run dev)"
echo "  2) Run automated E2E tests (Playwright)"
echo "  3) Open manual testing guide"
echo "  4) Check Supabase connection"
echo "  5) Test Pipedrive API connection"
echo "  6) View test execution report"
echo "  7) Open application in browser"
echo "  8) Exit"
echo ""

read -p "Select option (1-8): " choice

case $choice in
    1)
        print_status "info" "Starting development server..."
        print_status "info" "Application will be available at: http://localhost:5173"
        print_status "info" "Press Ctrl+C to stop the server"
        echo ""
        npm run dev
        ;;
    2)
        print_status "info" "Running E2E tests..."
        if [ -d "node_modules/@playwright" ]; then
            npm run test:e2e || print_status "warning" "Some tests may have failed"
        else
            print_status "error" "Playwright not installed"
            print_status "info" "Install with: npx playwright install"
        fi
        ;;
    3)
        print_status "info" "Opening manual testing guide..."
        if [ -f "src/MANUAL_TESTING_GUIDE.md" ]; then
            if command_exists less; then
                less src/MANUAL_TESTING_GUIDE.md
            else
                cat src/MANUAL_TESTING_GUIDE.md
            fi
        else
            print_status "error" "Manual testing guide not found"
        fi
        ;;
    4)
        print_status "info" "Checking Supabase connection..."
        if [ -f "scripts/health-check.js" ]; then
            node scripts/health-check.js
        else
            print_status "warning" "Health check script not found"
            print_status "info" "You can check manually by opening the app and checking browser console"
        fi
        ;;
    5)
        print_status "info" "Testing Pipedrive API connection..."
        if [ -f "scripts/test-pipedrive.js" ]; then
            node scripts/test-pipedrive.js
        else
            print_status "warning" "Pipedrive test script not found"
            print_status "info" "You can test manually by syncing contacts in the application"
        fi
        ;;
    6)
        print_status "info" "Opening test execution report..."
        if [ -f "MANUAL_TEST_EXECUTION_REPORT.md" ]; then
            if command_exists less; then
                less MANUAL_TEST_EXECUTION_REPORT.md
            else
                cat MANUAL_TEST_EXECUTION_REPORT.md
            fi
        else
            print_status "error" "Test execution report not found"
        fi
        ;;
    7)
        print_status "info" "Opening application in browser..."
        print_status "warning" "Make sure dev server is running first!"
        
        # Try to open browser
        if command_exists xdg-open; then
            xdg-open http://localhost:5173
        elif command_exists open; then
            open http://localhost:5173
        elif command_exists start; then
            start http://localhost:5173
        else
            print_status "info" "Please manually open: http://localhost:5173"
        fi
        ;;
    8)
        print_status "info" "Exiting..."
        exit 0
        ;;
    *)
        print_status "error" "Invalid option"
        exit 1
        ;;
esac

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
print_status "success" "Testing assistant completed"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "For comprehensive testing, follow these steps:"
echo "  1. Start dev server (option 1)"
echo "  2. Open app in browser (option 7)"
echo "  3. Follow MANUAL_TEST_EXECUTION_REPORT.md"
echo "  4. Document all findings"
echo ""
