#!/bin/bash
# Script to set up the llm-report-worker

# Navigate to llm-report-worker directory
cd /var/projects/backend-api/llm-report-worker

# Create lib directory if it doesn't exist
mkdir -p lib

# Create logger.js
cat > lib/logger.js << 'EOF'
// lib/logger.js
const pino = require('pino');

// Create a basic logger configuration
const loggerConfig = {
  level: process.env.LOG_LEVEL || 'info',
  
  // Only use pretty logging if not in production
  ...(process.env.NODE_ENV !== 'production' ? {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true
      }
    }
  } : {})
};

const logger = pino(loggerConfig);

module.exports = logger;
EOF

# Make sure pino and pino-pretty are installed
npm list pino || npm install --save pino
npm list pino-pretty || npm install --save pino-pretty

# Create or update .env file if it doesn't exist
if [ ! -f .env ]; then
  cat > .env << 'EOF'
# LLM Report Worker Environment
NODE_ENV=development
LOG_LEVEL=debug

# RabbitMQ Configuration
RABBITMQ_HOST=rabbitmq
RABBITMQ_PORT=5672
RABBITMQ_USER=admin
RABBITMQ_PASS=PCPLm4hnigq#2025
RABBITMQ_QUEUE=llm_reports

# Database Configuration (if needed)
POSTGRES_HOST=pgvector-db
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=postgres

# Add any other needed environment variables
EOF
fi

# Create logs directory
mkdir -p logs

echo "Setup complete! Now rebuild and restart the llm-report-worker container:"
echo "cd /var/projects/backend-api && docker-compose build llm-report-worker && docker-compose up -d llm-report-worker"
