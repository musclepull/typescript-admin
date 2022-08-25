import {CookieOptions, Response} from 'express'
import * as jwt from 'jsonwebtoken'

import {
  AccessToken,
  AccessTokenPayload,
  Cookies,
  RefreshToken,
  RefreshTokenPayload,
  UserDocument,
  twitterUserDocument,
} from './shared/auth'

import config from './config'

enum TokenExpiration {
  Access = 5 * 60, //expires in 5 mins
  Refresh = 7 * 24 * 60 * 60, //expires in 7 days
  RefreshIfLessThan = 4 * 24 * 60 * 60,
}

function signAccessToken(payload: AccessTokenPayload) {
  return jwt.sign(payload, config.ACCESS_TOKEN_SECRET, {expiresIn: TokenExpiration.Access})
}

function signRefreshToken(payload: RefreshTokenPayload) {
  return jwt.sign(payload, config.REFRESH_TOKEN_SECRET, {expiresIn: TokenExpiration.Refresh})
}

const defaultCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: config.IS_PRODUCTION,
  sameSite: config.IS_PRODUCTION ? 'strict' : 'lax',
  domain: config.BASE_DOMAIN,
  path: '/',
}

const refreshTokenCookieOptions: CookieOptions = {
  ...defaultCookieOptions,
  maxAge: TokenExpiration.Refresh * 1000,
}

const accessTokenCookieOptions: CookieOptions = {
  ...defaultCookieOptions,
  maxAge: TokenExpiration.Access * 1000,
}

export function verifyRefreshToken(token: string) {
  return jwt.verify(token, config.REFRESH_TOKEN_SECRET) as RefreshToken
}

export function verifyAccessToken(token: string) {
  try {
    return jwt.verify(token, config.ACCESS_TOKEN_SECRET) as AccessToken
  } catch (e) {}
}

export function buildTokens(user: UserDocument) {
  const accessPayload: AccessTokenPayload = {userId: user._id}
  //version is used to revoke the token later
  const refreshPayload: RefreshTokenPayload = {userId: user._id, version: user.tokenVersion}

  //take both payloads and convert them into tokens. This process is called signing
  const accessToken = signAccessToken(accessPayload)
  const refreshToken = refreshPayload && signRefreshToken(refreshPayload)

  return {accessToken, refreshToken}
}

export function buildTwitterTokens(user: twitterUserDocument) {
  const accessPayload: AccessTokenPayload = {userId: user._id}
  //version is used to revoke the token later
  const refreshPayload: RefreshTokenPayload = {userId: user._id, version: user.tokenVersion}

  //take both payloads and convert them into tokens. This process is called signing
  const accessToken = signAccessToken(accessPayload)
  const refreshToken = refreshPayload && signRefreshToken(refreshPayload)

  return {accessToken, refreshToken}
}

export function setTokens(res: Response, access: string, refresh?: string) {
  //stores both tokens in cookies
  res.cookie(Cookies.AccessToken, access, accessTokenCookieOptions)
  if (refresh) res.cookie(Cookies.RefreshToken, refresh, refreshTokenCookieOptions)
}

export function refreshTokens(current: RefreshToken, tokenVersion: number) {
  if (tokenVersion !== current.version) throw 'Token revoked'

  const accessPayload: AccessTokenPayload = {userId: current.userId}
  let refreshPayload: RefreshTokenPayload | undefined

  const expiration = new Date(current.exp * 1000)
  const now = new Date()
  const secondsUntilExpiration = (expiration.getTime() - now.getTime()) / 1000

  if (secondsUntilExpiration < TokenExpiration.RefreshIfLessThan) {
    refreshPayload = {userId: current.userId, version: tokenVersion}
  }

  const accessToken = signAccessToken(accessPayload)
  const refreshToken = refreshPayload && signRefreshToken(refreshPayload)

  return {accessToken, refreshToken}
}

export function clearTokens(res: Response) {
  res.cookie(Cookies.AccessToken, '', {...defaultCookieOptions, maxAge: 0})
  res.cookie(Cookies.RefreshToken, '', {...defaultCookieOptions, maxAge: 0})
}
