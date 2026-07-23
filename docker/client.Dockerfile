FROM node:18-alpine

WORKDIR /app

# Copy root packages to resolve local dependencies if needed
COPY package.json package-lock.json ./
COPY client/package.json ./client/

# Install client packages
RUN npm install --prefix client

# Copy all source code
COPY . .

# Set working directory to client for running Vite
WORKDIR /app/client

EXPOSE 5173

CMD ["npm", "run", "dev"]
