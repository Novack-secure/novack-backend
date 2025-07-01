FROM node:20.10.0-alpine3.18

WORKDIR /usr/src/app

# Install dependencies for bcrypt and other native modules
RUN apk add --no-cache python3 make g++ gcc git

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml ./

# Install pnpm
RUN npm install -g pnpm

# Install all dependencies
RUN pnpm install

# Explicitly install typeorm and rebuild bcrypt
RUN pnpm add typeorm@0.3.24 pg twilio 
RUN cd node_modules/bcrypt && npm rebuild bcrypt --build-from-source

# Copy source code
COPY . .

# Build the TypeScript project
RUN pnpm run build

# Create logs directory
RUN mkdir -p /usr/src/app/logs
RUN chmod 777 /usr/src/app/logs

# Expose the port
EXPOSE 4000

# Start the application
CMD ["node", "dist/src/main.js"]
