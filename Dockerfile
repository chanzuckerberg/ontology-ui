# Use an official Node.js runtime as the base image
FROM node:18

# Set the working directory in the container
WORKDIR /app

# Copy the package.json and package-lock.json files into the container
COPY package*.json ./

# Install the dependencies
RUN npm ci

# Copy the rest of the application files into the container
COPY . .

# Build the application
RUN npm run build

# Expose port 3000 for the development server
EXPOSE 3000

# Start the development server
CMD ["npm", "run", "dev"]