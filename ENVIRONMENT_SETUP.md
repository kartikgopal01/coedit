# Environment Setup Guide

## Required Environment Variables

Create a `.env.local` file in your project root with the following variables:

### Clerk Authentication
```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_publishable_key
CLERK_SECRET_KEY=sk_test_your_clerk_secret_key
```

### Firebase Client Configuration
```bash
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyCkyLcxwDu6zixx6XeWCxUdiBHEdfAeOCo
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=coedit-eb4b1.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=coedit-eb4b1
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=coedit-eb4b1.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=876686436585
NEXT_PUBLIC_FIREBASE_APP_ID=1:876686436585:web:68f548d3ff5f991f116878
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XCS971SZNB
```

### AWS S3 Configuration
```bash
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=coedit-codeit
```

### Firebase Admin (Service Account)

**Option 1: JSON String (Recommended for development)**
```bash
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"coedit-eb4b1","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"firebase-adminsdk-...@coedit-eb4b1.iam.gserviceaccount.com","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-...@coedit-eb4b1.iam.gserviceaccount.com"}
```

**Option 2: File Path (For production)**
```bash
FIREBASE_SERVICE_ACCOUNT_KEY=./firebase-service-account.json
```

## How to Get These Values

### Clerk Keys
1. Go to [Clerk Dashboard](https://dashboard.clerk.com/)
2. Create a new application or select existing one
3. Go to API Keys section
4. Copy the Publishable Key and Secret Key

### Firebase Configuration
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (coedit-eb4b1)
3. Go to Project Settings > General
4. Scroll down to "Your apps" section
5. Copy the config values

### Firebase Service Account
1. In Firebase Console, go to Project Settings > Service Accounts
2. Click "Generate new private key"
3. Download the JSON file
4. For development: Copy the entire JSON content as a single line
5. For production: Save the file and reference the path

### AWS S3 Setup
1. Go to [AWS Console](https://console.aws.amazon.com/)
2. Create an S3 bucket named `coedit-codeit` (or your preferred name)
3. Create an IAM user with S3 permissions:
   - `AmazonS3FullAccess` (for development)
   - Or create custom policy with specific bucket permissions
4. Generate Access Key and Secret Access Key
5. Update your `.env.local` with the credentials

## Testing the Setup

1. Run `npm run dev`
2. Visit `http://localhost:3000`
3. Try signing in/signing up
4. Check browser console for Firebase auth sync messages

## Troubleshooting

- **JSON Parse Error**: Make sure the service account key is properly escaped as a single line
- **Clerk Not Working**: Verify your Clerk keys are correct and the app is properly configured
- **Firebase Sync Issues**: Check that all Firebase environment variables are set correctly
