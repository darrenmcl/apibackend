FROM node:18
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
# Create the directory structure first
RUN mkdir -p ../lib
# Copy the logger file to the expected location
COPY ./lib/logger.js ../lib/
# Then copy the rest of your application
COPY . .
CMD ["node", "emailConsumer.js"]
