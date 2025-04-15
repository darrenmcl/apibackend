FROM node:18
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
RUN npm install --save pino pino-pretty
COPY . .
RUN mkdir -p lib logs
CMD ["node", "worker.js"]
