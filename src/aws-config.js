// src/aws-config.js
import { Amplify } from 'aws-amplify';

// Single, centralized Amplify configuration
const awsConfig = {
  Auth: {
    Cognito: {
      region: 'eu-north-1',
      userPoolId: 'eu-north-1_6iqNVmPOU',
      userPoolClientId: '429j39pso5a1cej48isrdfdaqr',
      loginWith: {
        oauth: {
          domain: 'eu-north-16iqnvmpou.auth.eu-north-1.amazoncognito.com',
          scopes: ['email', 'openid', 'profile'],
          redirectSignIn: ['https://www.wishfulitaly.app/auth/callback'],
          redirectSignOut: ['https://www.wishfulitaly.app/login'],
          responseType: 'code'
        }
      }
    }
  },
  API: {
    GraphQL: {
      // TikTok API endpoint
      endpoint: 'https://2f45a3dyujhtneeriylqv7vsle.appsync-api.eu-north-1.amazonaws.com/graphql',
      region: 'eu-north-1',
      defaultAuthMode: 'apiKey',
      apiKey: 'da2-mzdjn4b7zvd2dephbclxsdbk5a'
    },
    // Add the Orders API as a named API
    OrdersAPI: {
      endpoint: 'https://xbsjuczggret7mxcy27hpmc4nu.appsync-api.eu-north-1.amazonaws.com/graphql',
      region: 'eu-north-1',
      defaultAuthMode: 'apiKey',
      apiKey: 'da2-ydcbdme4x5gehesrhrmi6ltdja'
    }
  }
};

// Initialize Amplify with proper error handling
try {
  console.log('Configuring Amplify...');
  Amplify.configure(awsConfig);
  console.log('Amplify configured successfully');
} catch (error) {
  console.error('Error configuring Amplify:', error);
}

export default awsConfig;