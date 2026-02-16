FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 5000

# Use environment variable from docker-compose, not .env file
ENV MONGODB_URI=mongodb://mongodb:27017/recipe-book

CMD ["npm", "run", "dev"]
