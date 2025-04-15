FROM node:18
WORKDIR /usr/src/app

# Copy package files
COPY ./email/package*.json ./

# Install dependencies
RUN npm install --include=dev

# Create directories that might be needed
RUN mkdir -p middlewares lib logs

# Copy the email consumer code
COPY ./email/ ./

# Copy needed files from the main project
COPY ./middlewares/ ./middlewares/
COPY ./lib/ ./lib/

# Create log directory if it doesn't exist
RUN mkdir -p /usr/src/app/logs

# Make sure pino-pretty is installed
RUN npm list pino-pretty || npm install --save pino-pretty

# Command to run the app
CMD ["node", "emailConsumer.js"]
