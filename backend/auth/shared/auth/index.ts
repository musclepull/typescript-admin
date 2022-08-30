export enum Cookies {
  AccessToken = 'access',
  RefreshToken = 'refresh',
  AuthToken = 'isauth'
}

export interface UserDocument {
  _id: string
  name: string
  tokenVersion: number
  gitHubUserId: string
}

export interface twitterUserDocument {
  _id: string
  name: string
  tokenVersion: number
  twitterUserId: string
}

export interface AccessTokenPayload {
  userId: string
}

export interface AccessToken extends AccessTokenPayload {
  exp: number
}

export interface RefreshTokenPayload {
  userId: string
  version: number
}

export interface RefreshToken extends RefreshTokenPayload {
  exp: number
}
