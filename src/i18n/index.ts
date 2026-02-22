import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'

import { pmNativeConfig } from '@/pm-native.config'

void i18next.use(initReactI18next).init({
  compatibilityJSON: 'v4',
  lng: pmNativeConfig.i18n.defaultLocale,
  fallbackLng: pmNativeConfig.i18n.defaultLocale,
  resources: {
    en: {
      translation: {
        home: {
          title: 'Home'
        },
        auth: {
          login: 'Login',
          register: 'Register',
          forgotPassword: 'Forgot Password'
        }
      }
    }
  },
  interpolation: {
    escapeValue: false
  }
})

export default i18next
