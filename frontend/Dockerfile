FROM node:16-alpine

WORKDIR /app
COPY package.json yarn.lock frontend/
COPY next.config.js frontend/next.config.js
COPY src frontend/src
COPY styles frontend/styles
COPY public frontend/public
COPY tsconfig.json frontend/tsconfig.json
WORKDIR /app/frontend
RUN yarn install --frozen-lockfile

CMD ["yarn", "dev"]