# Base image with Node.js 18
FROM node:18-slim

# Set working directory
WORKDIR /usr/src/app
RUN npm install chartjs-node-canvas
# Install required system libraries for Puppeteer + Chromium
RUN apt-get update && apt-get install -y \
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
RUN npm install
RUN npm install puppeteer
# Copy the rest of the worker code
COPY . .

# Default command
CMD ["node", "worker.js"]
