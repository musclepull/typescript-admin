import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import session from 'express-session'
import config from './config'
import {databaseClient} from './user-database'
import {getGitHubUser} from './github-adapter'
import {getTwitterUser} from './twitter-adapter'
import {twitterOAuth2} from 'twitter-oauth2'
import {request} from 'undici'

import {
  getUserByGitHubId,
  getUserByTwitterId,
  createUser,
  createTwitterUser,
  setupUserIndexes,
  getUserById,
  increaseTokenVersion,
} from './user-service'
import {
  buildTokens,
  buildTwitterTokens,
  setTokens,
  refreshTokens,
  clearTokens,
  verifyRefreshToken,
} from './token-utils'
import {Cookies} from './shared/auth'

import {authMiddleware} from './auth-middleware'

const app = express()

app.use(cors({credentials: true, origin: config.CLIENT_URL}))
app.use(cookieParser())

app.use(
  session({
    name: 'YOUR-SESSION-NAME',
    secret: 'YOUR-SECRET',
    resave: false,
    saveUninitialized: true,
  })
)

app.get('/', (req, res) => res.send('api is healthy')) //Kubernetes health check in

app.get('/github', async (req, res) => {
  const {code} = req.query
  console.log(`Starting...`)
  const gitHubUser = await getGitHubUser(code as string)
  console.log(`GitHub User ID: ${gitHubUser.id}`)
  console.log(`GitHub User Name: ${gitHubUser.name}`)
  let user = await getUserByGitHubId(gitHubUser.id)
  console.log(`Mongo User Name: ${user?.name}`)
  if (!user) user = await createUser(gitHubUser.name, gitHubUser.id)
  //hand out refresh and access tokens
  const {accessToken, refreshToken} = buildTokens(user)
  //set Tokens in response Object
  setTokens(res, accessToken, refreshToken)
  //redirect to home page
  res.redirect(`${config.CLIENT_URL}/dashboards/crm/`)
})

app.use(
  twitterOAuth2({
    client_id: config.TWITTER_CLIENT_ID,
    client_secret: config.TWITTER_CLIENT_SECRET,
    redirect_uri: config.TWITTER_REDIRECT_URL,
    scope: 'tweet.read users.read offline.access',
  })
)

app.get('/twitter', async function (req, res) {
  const tokenSet = req.session.tokenSet
  console.log(`Starting Twitter...`)
  console.log('received tokens %j', req.session.tokenSet)
  console.log('access_token: ' + tokenSet?.access_token)
  const {body} = await request('https://api.twitter.com/2/users/me', {
    headers: {
      Authorization: `Bearer ${tokenSet?.access_token}`,
    },
  })
  const user_obj = await body.json()
  const username = user_obj.data.username
  const twitter_id = user_obj.data.id
  console.log(`Hello ${username}!`)
  console.log(`Twitter ID: ${twitter_id}`)
  console.log(`Twitter Name: ${username}`)
  let twitter_user = await getUserByTwitterId(twitter_id)
  if (!twitter_user) twitter_user = await createTwitterUser(username, twitter_id)
  //hand out refresh and access tokens
  const {accessToken, refreshToken} = buildTwitterTokens(twitter_user)
  //set Tokens in response Object
  setTokens(res, accessToken, refreshToken)
  //redirect to home page
  res.redirect(`${config.CLIENT_URL}/dashboards/crm/`)
})

app.post('/refresh', async (req, res) => {
  try {
    const current = verifyRefreshToken(req.cookies[Cookies.RefreshToken])
    const user = await getUserById(current.userId)
    if (!user) throw 'User not found'

    const {accessToken, refreshToken} = refreshTokens(current, user.tokenVersion)
    setTokens(res, accessToken, refreshToken)
  } catch (error) {
    clearTokens(res)
  }

  res.end()
})

app.post('/logout', authMiddleware, (req, res) => {
  clearTokens(res)
  res.end()
})

app.post('/logout-all', authMiddleware, async (req, res) => {
  await increaseTokenVersion(res.locals.token.userId)
  clearTokens(res)
  res.end()
})

app.get('/home', authMiddleware, async (req, res) => {
  console.log('mongo_id:' + res.locals.token.userId)
  const user = await getUserById(res.locals.token.userId)
  console.log(
    'Mongo User: ' + user?.name + ' - id: ' + user?.id + ' - GitHubID: ' + user?.gitHubUserId
  )
  res.json(user)
})

async function main() {
  await databaseClient.connect()
  await setupUserIndexes()

  app.listen(3000)
}

main()
