#!/bin/bash

# Quick Control Script for SalesMachine

echo "🚀 SalesMachine Control Panel"
echo "=============================="
echo ""
echo "1. Setup Backend (Create DB + Seed Data)"
echo "2. Test Backend Connection"
echo "3. Start Dev Server"
echo "4. View Live App (http://localhost:5173)"
echo "5. Show Database Schema"
echo "6. View Backend Logs"
echo ""

read -p "Vyberte volbu (1-6): " choice

case $choice in
  1)
    echo ""
    echo "🔧 Setting up backend..."
    node scripts/setup-backend.mjs
    ;;
  2)
    echo ""
    echo "📡 Testing backend connection..."
    node scripts/test-backend.mjs
    ;;
  3)
    echo ""
    echo "🚀 Starting dev server..."
    npm run dev
    ;;
  4)
    echo ""
    echo "🌐 Opening app in browser..."
    "$BROWSER" http://localhost:5173 || open http://localhost:5173 || xdg-open http://localhost:5173
    ;;
  5)
    echo ""
    echo "📊 Database Schema:"
    echo "===================="
    cat supabase/migrations/20260116_create_core_tables.sql | head -100
    echo ""
    echo "See full schema in: supabase/migrations/20260116_create_core_tables.sql"
    ;;
  6)
    echo ""
    echo "📋 Backend Documentation:"
    echo "========================="
    cat BACKEND_SETUP.md
    ;;
  *)
    echo "Neplatná volba"
    exit 1
    ;;
esac
