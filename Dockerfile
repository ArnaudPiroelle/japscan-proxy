FROM node:lts-alpine

RUN apk add git

WORKDIR /app
COPY package.json /app
RUN npm install
COPY . /app

CMD ["npm", "run", "serve"]