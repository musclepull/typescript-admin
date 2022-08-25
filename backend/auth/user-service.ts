import {v4 as uuidv4} from 'uuid'

import {twitterUserDocument, UserDocument} from './shared/auth'

import config from './config'
import {databaseClient} from './user-database'
import {stringify} from 'querystring'
let globalCollection: any

function collection() {
  return databaseClient.db(config.MONGODB_DATABASE).collection<UserDocument>('users')
}

function twitter_collection() {
  return databaseClient.db(config.MONGODB_DATABASE).collection<twitterUserDocument>('users')
}

export async function setupUserIndexes() {
  console.log('Inside setupUserIndexes')
  const coll = await collection()
  await coll.createIndexes(
    [
      {key: {id: 1}, name: 'id'},
      {key: {gitHubUserId: 1}, name: 'googleUserId'},
    ],
    {unique: true}
  )
}

export async function createUser(name: string, gitHubUserId: number) {
  console.log('Inside createUser')
  const user: UserDocument = {
    //@ts-ignore
    _id, uuidv4,
    name,
    tokenVersion: 0,
    gitHubUserId: gitHubUserId.toString(),
  }

  const coll = await collection()
  const result = await coll.insertOne(user)
  console.log()
  if (result.acknowledged) return user

  throw new Error()
}

export async function createTwitterUser(name: string, twitterUserId: number) {
  console.log('Inside Twitter createUser')
  const user: twitterUserDocument = {
    //@ts-ignore
    _id: uuidv4,
    name,
    tokenVersion: 0,
    twitterUserId: twitterUserId.toString(),
  }

  const coll = await twitter_collection()
  const result = await coll.insertOne(user)
  console.log()
  if (result.acknowledged) return user

  throw new Error()
}

export async function increaseTokenVersion(userId: string) {
  console.log('Inside increaseTokenVersion')
  const coll = await collection()
  const result = await coll.findOneAndUpdate({id: userId}, {$inc: {tokenVersion: 1}})
  if (result.ok) return result.value

  throw new Error()
}

export async function getUserById(id: string) {
  console.log('Inside getUserById')
  const coll = await collection()
  return coll.findOne({id})
}

export async function getUserByGitHubId(gitHubUserId: number) {
  console.log('Inside getUserByGitHubId')
  const coll = await collection()
  return coll.findOne({gitHubUserId: gitHubUserId.toString()})
}

export async function getUserByTwitterId(twitterId: number) {
  const coll = await twitter_collection()
  return coll.findOne({twitterId: twitterId.toString()})
}
