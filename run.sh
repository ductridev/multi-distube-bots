#!/bin/bash
npm run db:push

# Build and start dashboard in background
cd dashboard && npm install && npm run build && npm start &

# Return to root and start bot
npm start
