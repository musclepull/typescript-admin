import * as mongodb from 'mongodb'

import config from './config'

const url = config.MONGODB_URL
const user = config.MONGODB_USER
const password = config.MONGODB_PASSWORD

export const databaseClient = new mongodb.MongoClient(url, {auth: {username: user, password}})
