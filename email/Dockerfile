FROM node:18
WORKDIR /usr/src/app

# Use root project dependencies (not just email)
COPY ./package*.json ./
RUN npm install --include=dev

# Create needed directories
RUN mkdir -p middlewares lib logs

# Copy app files
COPY ./email/ ./
COPY ./middlewares/ ./middlewares/
COPY ./lib/ ./lib/

# Start the consumer
CMD ["node", "emailConsumer.js"]
