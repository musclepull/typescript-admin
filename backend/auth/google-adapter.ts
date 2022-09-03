import cookieParser from 'cookie-parser'
import jwt from "jsonwebtoken";
import cors from 'cors'
import express from 'express'
import session from 'express-session'
import envConfig from './config'
import {databaseClient} from './user-database'
import axios from 'axios'
import { env } from 'process'
import {google} from 'googleapis'

interface GoogleUser {
    id: string
    name: string
    email: string
  }

const oauth2Client = new google.auth.OAuth2(
    envConfig.GOOGLE_CLIENT_ID,
    envConfig.GOOGLE_CLIENT_SECRET,
    envConfig.GOOGLE_REDIRECT_URL
  );

  google.options({auth: oauth2Client});

export function getGoogleAuthURL() {
      // Access scopes for read-only Drive activity.
      const scopes = [
        'https://www.googleapis.com/auth/userinfo.profile', // get user info
        'https://www.googleapis.com/auth/userinfo.email',   // get user email ID and if its verified or not
      ];
  
    const authorizationUrl = oauth2Client.generateAuthUrl({
        // 'online' (default) or 'offline' (gets refresh_token)
        access_type: 'offline',
        /** Pass in the scopes array defined above.
          * Alternatively, if only one scope is needed, you can pass a scope URL as a string */
        scope: scopes,
        prompt: "consent", 
        // Enable incremental authorization. Recommended as a best practice.
        include_granted_scopes: true,
        state: "GOOGLE_LOGIN",
      });

    return `${authorizationUrl}`;
  }

  export async function getTokens(code : string){
    console.log('Inside get tokens of google')
    let { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials({access_token: tokens.access_token});
    return tokens;
  }

  export async function getGoogleUser(){   
    var oauth2 = google.oauth2({
        auth: oauth2Client,
        version: 'v2'
      });
      let { data } = await oauth2.userinfo.get();    // get user info
      return data as GoogleUser
  }