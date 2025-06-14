# llm-report-worker/Dockerfile
FROM node:18

# Set working directory
WORKDIR /usr/src/app

# Install required system libraries for Puppeteer + Chromium ONLY
RUN apt-get update && apt-get install -y \
    chromium \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libxss1 \
    libxcomposite1 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libgtk-3-0 \
    libx11-xcb1 \
    libxdamage1 \
    xdg-utils \
    ca-certificates \
    fonts-liberation \
    wget \
    libdbus-1-3 \
    libgdk-pixbuf2.0-0 \
    libnspr4 \
    libcups2 \
    --no-install-recommends && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy package files and install dependencies
COPY package*.json ./

# Clean install - use regular npm install since we don't have package-lock.json
RUN npm install --omit=dev

# Copy the rest of the worker code
COPY . .

# Create a directory for temporary PDF files
RUN mkdir -p /tmp/pdf-output && chmod 777 /tmp/pdf-output

# Set environment variable to tell Puppeteer to skip downloading its own Chrome/Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Tell Puppeteer where to find the system-installed Chromium.
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Default command
CMD ["node", "worker.js"]
