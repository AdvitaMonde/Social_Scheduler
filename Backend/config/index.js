require('dotenv').config();

function required(name) {
  const val = process.env[name];
  if (!val) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return val;
}

module.exports = {
  port: process.env.PORT || 4000,
  baseUrl: process.env.BASE_URL || 'http://localhost:4000',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/ai-social-scheduler',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',

  firebase: {
    // Base64-encoded JSON of a Firebase service account key (Firebase Console ->
    // Project Settings -> Service Accounts -> Generate new private key).
    // Encode with: base64 -i serviceAccountKey.json | tr -d '\n'
    serviceAccountBase64: () => required('FIREBASE_SERVICE_ACCOUNT_BASE64')
  },

  meta: {
    appId: () => required('META_APP_ID'),
    appSecret: () => required('META_APP_SECRET'),
    redirectUri: () => required('META_REDIRECT_URI'),
    graphVersion: process.env.META_GRAPH_VERSION || 'v20.0',
    // Only request what you actually need — each of these (beyond the
    // default public profile) requires Meta App Review + Business
    // Verification before it works for anyone other than testers/admins
    // on your app.
    scopes: [
      'pages_show_list',
      'pages_manage_posts',
      'pages_read_engagement',
      'pages_manage_metadata',
      'instagram_basic',
      'instagram_content_publish',
      'business_management'
    ]
  },

  tokenEncryptionKey: () => required('TOKEN_ENCRYPTION_KEY')
};
