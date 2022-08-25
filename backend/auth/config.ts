
const config = {
  GITHUB_CLIENT_ID: '5ef1ea991f055ab133d3',
  GITHUB_CLIENT_SECRET: '1b09ff2ce49593988a91a433ee0bdd15e72ed492',
  GITHUB_REDIRECT_URL: 'http://localhost:3001/github',
  TWITTER_REDIRECT_URL: 'http://localhost:3001/twitter',
  TWITTER_CLIENT_ID: 'TGhGWFhwVnpBYktrMjhFaU4wNWU6MTpjaQ',
  TWITTER_CLIENT_SECRET: 'MLOK9FfisJIQNhPy4MAmMsWk1Kk97O8xcwj-8HDjiLJHFkruSU',
  CLIENT_URL: 'http://localhost:3000',
  API_URL: 'http://localhost:3001',
  NODE_ENV : 'development',
  BASE_DOMAIN: 'localhost',
  IS_PRODUCTION: false,

  ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET!,
  REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET!,

  MONGODB_URL: 'mongodb://mongodb:27017',
  MONGODB_USER: 'agopinath',
  MONGODB_PASSWORD: '5aSpuT3e!',
  MONGODB_DATABASE:  'database'
}

export default config