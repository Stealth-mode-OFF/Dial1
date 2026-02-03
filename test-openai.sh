#!/bin/bash

# Test OpenAI API through Supabase Edge Functions
source .env.production

# Remove quotes and newlines
SUPABASE_URL=$(echo $VITE_SUPABASE_URL | tr -d '"' | tr -d '\n')
ANON_KEY=$(echo $VITE_SUPABASE_ANON_KEY | tr -d '"' | tr -d '\n')

echo "Testing OpenAI API via Supabase Edge Functions..."
echo "Supabase URL: $SUPABASE_URL"
echo ""

# Test AI endpoint
echo "Testing /ai/spin/next endpoint..."
curl -X POST "${SUPABASE_URL}/functions/v1/make-server-139017f8/ai/spin/next" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "stage": "situation",
    "mode": "live",
    "transcriptWindow": ["Hello, how are you today?"],
    "recap": "",
    "dealState": "",
    "strict": false
  }' 2>&1 | jq -r '.error // .say_next // "Success"' | head -5

echo ""
echo "✓ Test completed"
