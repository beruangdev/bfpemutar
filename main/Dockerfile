FROM node:14

WORKDIR /src

COPY package.json package-lock.lock ./
RUN npm install

COPY . .
CMD ["npm", "start"]