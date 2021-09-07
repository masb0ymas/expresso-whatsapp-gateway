# Load node
FROM node:14-stretch

RUN apt-get update
RUN apt -y upgrade
RUN apt-get -y install curl gnupg nano

# Library for Pupetter
RUN apt-get install -y libpango-1.0-0 \
  libpangocairo-1.0-0 libstdc++6 libx11-6 \
  libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 \
  libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 \
  libxrender1 libxss1 libxtst6 lsb-release wget xdg-utils \
  libcups2 libxss1 libnss3-tools freetype2-demos libharfbuzz-dev \
  ca-certificates fonts-liberation libappindicator3-1 libasound2 \
  libatk-bridge2.0-0 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 \
  libexpat1 libfontconfig1 libgbm1 libgcc1 libglib2.0-0 libgtk-3-0 libnspr4 \
  libnss3 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 \
  libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 \
  libxrandr2 libxrender1 libxss1 libxtst6 lsb-release wget xdg-utils libnss3 wget

WORKDIR /app

# Set config npm & install dependencies
RUN npm config set scripts-prepend-node-path true
RUN npm install -g typescript
RUN npm install -g pm2

# Install app dependencies
COPY package.json ./
RUN yarn

ENV NODE_ENV production

# Bundle app source
COPY . .

RUN cp .env.example .env

# Build app
RUN yarn build

EXPOSE 8000

# Run for production
CMD ["yarn", "serve:docker"]
