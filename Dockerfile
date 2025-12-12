FROM node:20-alpine

WORKDIR /app

COPY package.json .

RUN npm install

COPY . .

EXPOSE 5173

# Ensure Vite listens on all interfaces so host can access it when containerized
CMD [ "npm", "run", "dev"]
