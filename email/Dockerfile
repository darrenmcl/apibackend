# Use an official Node.js runtime as a parent image
FROM node:18-alpine

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (or yarn.lock)
COPY package*.json ./

# Install app dependencies
RUN npm install --only=production

# --- THIS IS THE CORRECTED LINE ---
# Copy the rest of the application source code from the build context (.)
# to the working directory (.) in the container.
COPY . .

# Your app binds to port 3012, but this is a worker and likely doesn't need to expose a port.
# If it did, you would use: EXPOSE 3012

# Define the command to run your app
CMD ["node", "emailConsumer.js"]
