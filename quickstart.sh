#!/bin/bash

# FoodieCare AI System - Quick Start Script
# Usage: ./quickstart.sh

echo "🚀 FoodieCare AI System - Quick Start"
echo "======================================"
echo ""

# Check Node.js
echo "1️⃣  Checking Node.js version..."
node --version || {
  echo "❌ Node.js not found. Install Node.js 18+ from https://nodejs.org"
  exit 1
}
echo "✅ Node.js installed"
echo ""

# Install dependencies
echo "2️⃣  Installing dependencies..."
npm install
if [ $? -ne 0 ]; then
  echo "❌ npm install failed"
  exit 1
fi
echo "✅ Dependencies installed"
echo ""

# Verify setup
echo "3️⃣  Verifying setup..."
node lib/backend/verify-setup.js
echo ""

# Check nutrition data
echo "4️⃣  Checking nutrition data..."
if [ -f "nutrition.csv" ]; then
  count=$(wc -l < nutrition.csv)
  echo "✅ Nutrition CSV found ($count lines)"
else
  echo "⚠️  nutrition.csv not found - system will still work"
fi
echo ""

# Summary
echo "======================================"
echo "✅ Setup Complete!"
echo ""
echo "Next steps:"
echo "1. Run: npm run dev"
echo "2. Open: http://localhost:3000"
echo "3. Upload a food image"
echo "4. See AI prediction + nutrition"
echo ""
echo "Documentation:"
echo "- Quick Start: QUICK_REFERENCE.md"
echo "- Setup Help: SETUP.md"
echo "- Architecture: AI_SYSTEM_GUIDE.md"
echo ""
echo "Happy analyzing! 🍕📊"
