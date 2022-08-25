FROM node:16-alpine

WORKDIR /app
COPY package.json yarn.lock backend/
RUN yarn install --frozen-lockfile
COPY auth backend/auth
COPY tsconfig.json backend/tsconfig.json

EXPOSE 3000
CMD ["yarn", "start"]