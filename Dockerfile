# Use an official Node.js runtime as the base image
FROM node:16.17.1

# Set the working directory inside the container
WORKDIR /doppelganger-checker

# Copy the package.json and package-lock.json files to the working directory
COPY package*.json ./

# Install project dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the port that the Node.js server listens on
EXPOSE 3000

# Start the Node.js server
CMD [ "src/bin-checker.js"]
