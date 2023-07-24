FROM node:18

RUN apt-get update && apt-get install -y wireguard-tools iproute2 iputils-ping

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install --verbose

# If you are building your code for production
# RUN npm ci --omit=dev

# Bundle app source
COPY . .

EXPOSE 3000
CMD [ "node", "./bin/www" ]