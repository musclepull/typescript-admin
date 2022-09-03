// ** React Imports
import { createContext, useEffect, useState, ReactNode } from 'react'

import Cookies from 'js-cookie';

// ** Next Import
import { useRouter } from 'next/router'

// ** Axios
import axios from 'axios'

// ** Config
import authConfig from 'src/configs/auth'

// ** envConfig
import envConfig from 'src/configs/custom-env-variables'

// ** Types
import { AuthValuesType, RegisterParams, LoginParams, ErrCallbackType, UserDataType } from './types'

// ** Defaults
const defaultProvider: AuthValuesType = {
  user: null,
  loading: true,
  setUser: () => null,
  setLoading: () => Boolean,
  isInitialized: false,
  login: () => Promise.resolve(),
  logout: () => Promise.resolve(),
  setIsInitialized: () => Boolean,
  register: () => Promise.resolve(),
  twitterLogin: () => Promise.resolve(),
  googleLogin: () => Promise.resolve()
}

const AuthContext = createContext(defaultProvider)

type Props = {
  children: ReactNode
}

const AuthProvider = ({ children }: Props) => {
  // ** States
  const [user, setUser] = useState<UserDataType | null>(defaultProvider.user)
  const [loading, setLoading] = useState<boolean>(defaultProvider.loading)
  const [isInitialized, setIsInitialized] = useState<boolean>(defaultProvider.isInitialized)

  // ** Hooks
  const router = useRouter()

  const handleTwitterLogin = async() => {
    axios.get(`${envConfig.API_URL}/twitterlogin`)
  }

  const handleGoogleLogin = async() => {
    await axios.get(`${envConfig.API_URL}/auth/google/url`)
    .then(async response => {
      router.push(response.data)
    })
  }

  const successfulUserInitialization = async(response : any, token : any, authtype: any ) => {
    setLoading(false)
    const userObj = response.data
    userObj.role = 'admin'
    setUser(userObj)
    Cookies.set('access_token', token, { expires: 1 })
    Cookies.set('auth_type', authtype, { expires: 1 })
    await window.localStorage.setItem('userData', JSON.stringify(response.data))        
  }

  const errorUserInitialization = () => {
    localStorage.removeItem('userData')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('accessToken')
    setUser(null)
    setLoading(false)
    Cookies.remove('access_token')
    Cookies.remove('auth_type')
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fetchUserInfoAndRedirect = (token : string, twitter? : boolean, google? : boolean) => {
    setLoading(true)
    if(twitter){
       axios
        .get(`${envConfig.API_URL}/proxy/user?twitter=1`, {
          headers: {
            Authorization: token || ''
          }
        })
        .then(async response => {
          successfulUserInitialization(response, token, 'twitter')        
        })
        .catch(() => {
          errorUserInitialization()
        })
    }
    else if(google){
       axios
        .get(`${envConfig.API_URL}/proxy/user?google=1`, {
          headers: {
            Authorization: token || ''
          }
        })
        .then(response => {
          successfulUserInitialization(response, token, 'google')        
        })
        .catch(() => {
          errorUserInitialization()
        })
    }
    else{
       axios
        .get(`${envConfig.API_URL}/proxy/user`, {
          headers: {
            Authorization: token || ''
          }
        })
        .then(response => {
          successfulUserInitialization(response, token , 'github')        
        })
        .catch(() => {
          errorUserInitialization()
        })
    }
  }

  useEffect(() => {
    const initAuth = async (): Promise<void> => {
      setIsInitialized(true)
      const token = new URLSearchParams(window.location.search).get("access_token")
      const istwitter = new URLSearchParams(window.location.search).get("twitter") || Cookies.get('auth_type') === 'twitter' ? '1' : '0'
      const isgoogle = new URLSearchParams(window.location.search).get("google") || Cookies.get('auth_type') === 'google' ? '1' : '0'

      if(istwitter === '1'){
        if(Cookies.get('access_token')){
          fetchUserInfoAndRedirect(Cookies.get('access_token') || "", true)
        }
        else{
          if(token){
            fetchUserInfoAndRedirect(token|| "" , true)
          }
          else{
            setLoading(false)
          }
        }
      }
      else if(isgoogle === '1'){
        if(Cookies.get('access_token')){
          fetchUserInfoAndRedirect(Cookies.get('access_token') || "", false, true)
        }
        else{
          if(token){
            fetchUserInfoAndRedirect(token|| "" , false, true)
          }
          else{
            setLoading(false)
          }
        }
      }
      else{
        if(Cookies.get('access_token')){
          fetchUserInfoAndRedirect(Cookies.get('access_token') || "")
        }
        else{
          if (token) {
            fetchUserInfoAndRedirect(token || "")
          } else {
            setLoading(false)
          }
        }
      }
    }
    initAuth()
  },[])

  const handleLogin = (params: LoginParams, errorCallback?: ErrCallbackType) => {
    axios
      .post(authConfig.loginEndpoint, params)
      .then(async res => {
        window.localStorage.setItem(authConfig.storageTokenKeyName, res.data.accessToken)
      })
      .then(() => {
        axios
          .get(authConfig.meEndpoint, {
            headers: {
              Authorization: window.localStorage.getItem(authConfig.storageTokenKeyName)!
            }
          })
          .then(async response => {
            const returnUrl = router.query.returnUrl

            setUser({ ...response.data.userData })
            await window.localStorage.setItem('userData', JSON.stringify(response.data.userData))

            const redirectURL = returnUrl && returnUrl !== '/' ? returnUrl : '/'

            router.replace(redirectURL as string)
          })
      })
      .catch(err => {
        if (errorCallback) errorCallback(err)
      })
  }

  const handleLogout = () => {
    setUser(null)
    setIsInitialized(false)
    window.localStorage.removeItem('userData')
    window.localStorage.removeItem(authConfig.storageTokenKeyName)
    Cookies.remove('access_token')
    Cookies.remove('auth_type')
    router.push('/login')
  }

  const handleRegister = (params: RegisterParams, errorCallback?: ErrCallbackType) => {
    axios
      .post(authConfig.registerEndpoint, params)
      .then(res => {
        if (res.data.error) {
          if (errorCallback) errorCallback(res.data.error)
        } else {
          handleLogin({ email: params.email, password: params.password })
        }
      })
      .catch((err: { [key: string]: string }) => (errorCallback ? errorCallback(err) : null))
  }

  const values = {
    user,
    loading,
    setUser,
    setLoading,
    isInitialized,
    setIsInitialized,
    login: handleLogin,
    logout: handleLogout,
    register: handleRegister,
    twitterLogin: handleTwitterLogin,
    googleLogin: handleGoogleLogin
  }

  return <AuthContext.Provider value={values}>{children}</AuthContext.Provider>
}

export { AuthContext, AuthProvider }
