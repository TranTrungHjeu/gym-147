FROM node:20
WORKDIR /app
COPY package.json ./
RUN npm install --only=prod
COPY src ./src
EXPOSE 3000
CMD ["node","src/main.js"]
