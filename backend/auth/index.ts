import cookieParser from 'cookie-parser'
import jwt from "jsonwebtoken";
import cors from 'cors'
import express from 'express'
import session from 'express-session'
import envConfig from './config'
import {databaseClient} from './user-database'
import querystring from 'querystring';
import {getGitHubUser, getUser} from './github-adapter'
import axios from 'axios'
import { Client, auth } from "twitter-api-sdk";
import {getGoogleAuthURL, getTokens, getGoogleUser} from './google-adapter'

import {
  getUserByGitHubId,
  getUserByTwitterId,
	getUserByGoogleId,
  createUser,
  createTwitterUser,
  setupUserIndexes,
  getUserById,
  increaseTokenVersion,
	createGoogleUser,
} from './user-service'
import {
  buildTokens,
  buildTwitterTokens,
	buildGoogleTokens,
  setTokens,
  refreshTokens,
  clearTokens,
  verifyRefreshToken,
} from './token-utils'
import {Cookies, UserDocument} from './shared/auth'

import {authMiddleware} from './auth-middleware'
import { nextTick } from 'process'

const app = express()

app.use(cors({ origin: envConfig.CLIENT_URL, credentials: true,}))
app.use(cookieParser())

app.use(
  session({
    name: 'YOUR-SESSION-NAME',
    secret: 'YOUR-SECRET',
    resave: false,
    saveUninitialized: true,
  })
)

const authClient = new auth.OAuth2User({
  client_id: envConfig.TWITTER_CLIENT_ID as string,
  client_secret: envConfig.TWITTER_CLIENT_SECRET as string,
  callback: `${envConfig.API_URL}/twitter`,
  scopes: ["tweet.read", "users.read"],
});
const client = new Client(authClient);
const STATE = "my-state";

app.get('/', (req, res) => res.send('api is healthy')) //Kubernetes health check in

app.get("/github", (req, res) => {
  console.log(`Starting Redirect_github...`)
  axios({
    method: "POST",
    url: `${envConfig.GITHUB_AUTH_URL}?client_id=${envConfig.GITHUB_CLIENT_ID}&client_secret=${envConfig.GITHUB_CLIENT_SECRET}&code=${req.query.code}`,
    headers: {
      Accept: "application/json",
    },
  }).then(async (response) => {
    //redirect to home page
    res.redirect(`${envConfig.CLIENT_URL}?access_token=${response.data.access_token}`)
  });
});

//Getting Login URL
app.get("/auth/google/url", (req, res) => {
  return res.send(getGoogleAuthURL());
});

//Getting the user from Google with the code

app.get(`/auth/google`, async (req, res) => {
	console.log('Inside auth/google')
  const code = req.query.code as string;
	const {access_token,refresh_token} = await getTokens(code)
	console.log('Access_Token: ' + access_token)
  res.redirect(`${envConfig.CLIENT_URL}?access_token=${access_token}&google=1`);
});

app.get("/twitterlogin", async function (req, res) {
  const authUrl = authClient.generateAuthURL({
    state: STATE,
    code_challenge_method: "s256",    
  });
  res.redirect(authUrl);
});

app.get('/twitter', async (req: express.Request, res: express.Response) => {
  console.log(`Starting Authentication of Twitter API...`)
  try {
    const { code, state } = req.query;
    if (state !== STATE) return res.status(500).send("State isn't matching");
    const data = await authClient.requestAccessToken(code as string);
    res.redirect(`${envConfig.CLIENT_URL}?access_token=${data.token}`)
  } catch (error) {
    console.log(error);
  } 
})

app.get('/proxy/user', async (req, res) => {
  let user : any = null
  console.log(`Starting to find user...`)
  var access_token = req.headers.authorization;

  if (!access_token) {
    res.json('You do not have proper authentication')
  }

  if(req.query.twitter === '1'){
    // Example request
    const user  = await client.users.findMyUser();
    const username = user.data?.username
    const twitter_id = user.data?.id
    console.log(`Hello ${username}!`)
    console.log(`Twitter ID: ${twitter_id}`)
    console.log(`Twitter Name: ${username}`)
    let twitter_user = await getUserByTwitterId(twitter_id || "")
    if (!twitter_user) twitter_user = await createTwitterUser(username || "", twitter_id || "")
    const {accessToken, refreshToken} = buildTwitterTokens(twitter_user)
    //set Tokens in response Object
    setTokens(res, accessToken, refreshToken)
    //return mongo user
    console.log(`Found Twitter-Mongo user and now returning it`)
    res.json(twitter_user)
  }
  else if(req.query.google === '1'){
		console.log("get Google Me");
		// Fetch the user's profile with the access token and bearer
		const user = await getGoogleUser()
		const username = user.name
    const google_id = user.id
		console.log(`Google User ID: ${user.id}`)
    console.log(`Google User Name: ${user.name}`)
		let google_user = await getUserByGoogleId(user.id)
    console.log(`Mongo User Name: ${user?.name}`)
    if (!google_user) google_user = await createGoogleUser(username, google_id)
		//hand out refresh and access tokens
		const {accessToken, refreshToken} = buildGoogleTokens(google_user)
		//set Tokens in response Object
		setTokens(res, accessToken, refreshToken)
		//return mongo user
		console.log(`Found user and now returning it`)
		res.json(user)
}
  else{
    const gitHubUser = await getUser(access_token as string)
    console.log(`GitHub User ID: ${gitHubUser.id}`)
    console.log(`GitHub User Name: ${gitHubUser.name}`)
    user = await getUserByGitHubId(gitHubUser.id)
    console.log(`Mongo User Name: ${user?.name}`)
    if (!user) user = await createUser(gitHubUser.name, gitHubUser.id)
    //hand out refresh and access tokens
    const {accessToken, refreshToken} = buildTokens(user)
    //set Tokens in response Object
    setTokens(res, accessToken, refreshToken)
    //return mongo user
    console.log(`Found user and now returning it`)
    res.json(user)
  }
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
    'Mongo User: ' + user?.name + ' - id: ' + user?._id + ' - GitHubID: ' + user?.gitHubUserId
  )
  res.json(user)
})

async function main() {
  await databaseClient.connect()
  await setupUserIndexes()

  app.listen(3000)
}

main()
