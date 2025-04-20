# backend/Dockerfile
FROM node:18

RUN apt-get update && apt-get install -y docker.io

# Install Python
RUN apt-get update && apt-get install -y python3


WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

EXPOSE 3001
CMD ["node", "server.js"]
