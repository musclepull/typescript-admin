import axios from 'axios'
import config from './config'

interface TwitterUser {
  id: number
  name: string
}

interface AccessTokenResponse {
  access_token: string
}

interface UserResponse {
  id: number
  name: string
}

const TOKEN_URL = 'https://api.twitter.com/2/oauth2/token'
const USER_URL = 'https://api.twitter.com/2/users'

export async function getTwitterUser(code: string) {
  const token = await getTwitterAccessToken(code)
  return getUser(token)
}

async function getTwitterAccessToken(code: string) {
  const response = await axios.post<AccessTokenResponse>(
    TOKEN_URL,
    {
      client_id: config.TWITTER_CLIENT_ID,
      client_secret: config.TWITTER_CLIENT_SECRET,
      code,
    },
    {
      headers: {Accept: 'application/json'},
    }
  )
  return response.data.access_token
}

async function getUser(token: string) {
  const response = await axios.get<UserResponse>(USER_URL, {
    headers: {Authorization: `Bearer ${token}`},
  })

  return response.data as TwitterUser
}
