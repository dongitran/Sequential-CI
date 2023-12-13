FROM node:latest

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY dist/ ./dist/
COPY index.js ./dist/

EXPOSE 3000

CMD ["node", "dist/index.js"]
