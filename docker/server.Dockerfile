FROM node:18-alpine

WORKDIR /app

# Copy root packages to resolve local dependencies if needed
COPY package.json package-lock.json ./
COPY server/package.json ./server/

# Install server packages
RUN npm install --prefix server

# Copy all source code
COPY . .

# Set working directory to server
WORKDIR /app/server

EXPOSE 5000

CMD ["npm", "run", "start"]
