FROM node:18
WORKDIR /usr/src/app

# Install deps from root
COPY ./package*.json ./
RUN npm install

# Copy shared code
COPY ./lib ./lib
COPY ./middlewares ./middlewares

# Copy the consumer code
COPY ./email ./email

WORKDIR /usr/src/app/email
CMD ["node", "emailConsumer.js"]
