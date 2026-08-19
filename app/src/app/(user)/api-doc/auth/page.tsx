'use client';

import { APIDocLayout } from '@/components/docs/APIDocLayout';
import { APIDocSection } from '@/components/docs/APIDocSection';

export default function AuthDocsPage() {
  const sections = [
    { id: 'send-otp', title: 'Send OTP' },
    { id: 'verify-otp', title: 'Verify OTP' },
    { id: 'register', title: 'Register' },
    { id: 'login', title: 'Login' },
    { id: 'google-login', title: 'Google Login' },
    { id: 'apple-login', title: 'Apple Login' },
    { id: 'refresh-token', title: 'Refresh Token' },
    { id: 'switch-account', title: 'Switch Account' },
    { id: 'link-additional-role', title: 'Link Additional Role' },
    { id: 'forgot-password', title: 'Forgot Password' },
    { id: 'reset-password', title: 'Reset Password' },
    { id: 'logout-user', title: 'Logout' },
  ];

  return (
    <APIDocLayout
      title="Auth API"
      description="Authentication and user account management for Zinga."
      sections={sections}
    >
      {/* Send OTP */}
      <APIDocSection
        id="send-otp"
        title="Send OTP"
        method="POST"
        path="/auth/send-otp"
        description="Sends a 5-digit OTP code to the user's phone number using Telnyx (primary) with an automatic fallback to Vonage. Protected by a Redis-backed rate limiter."
        details={[
          'Rate Limited: Maximum 5 requests per 10 minutes per IP to prevent spam and provider cost abuse.',
          'Automatically falls back to Vonage if Telnyx is unavailable or fails.',
          'The `requestId` and `otpProvider` returned should be passed to the verify endpoint.',
        ]}
        requestBody={`{
          "phoneNumber": "+16208036122"
        }`}
        successResponse={`{
          "success": true,
          "message": "OTP sent",
          "data": {
            "requestId": "xxxx-yyyy-zzzz",
            "otpProvider": "telnyx",
            "telnyxStatus": "pending"
          }
        }`}
        errorResponses={[
          `{
            "success": false,
            "message": "Too many requests, please try again later."
          }`,
          `{
            "success": false,
            "message": "Telnyx failed or unavailable and Vonage is not configured."
          }`,
        ]}
        validations={[
          '`phoneNumber` is required.',
          'Must be in international format: +{countryCode}{number} (e.g. +16208036122).',
        ]}
      />

      {/* Verify OTP */}
      <APIDocSection
        id="verify-otp"
        title="Verify OTP"
        method="POST"
        path="/auth/verify-otp"
        description="Verifies the 5-digit OTP code. If the request includes a valid Bearer token, it automatically updates and verifies the phone number on the user's active session profile."
        details={[
          'Rate Limited: Maximum 10 verification attempts per 10 minutes per IP to prevent brute-force attacks.',
          'If `otpProvider` is Vonage, `requestId` is strictly required.',
          'If authenticated (`Bearer <token>`), successfully verifying automatically syncs `phoneNumber` and `phoneVerified: true` across MongoDB and Firebase clusters.',
        ]}
        requestBody={`{
          "phoneNumber": "+16208036122",
          "code": "12345",
          "requestId": "xxxx-yyyy-zzzz",
          "otpProvider": "telnyx"
        }`}
        successResponse={`{
          "success": true,
          "message": "OTP verified",
          "data": { 
            "verified": true,
            "otpProvider": "telnyx" 
          }
        }`}
        errorResponses={[
          `{
            "success": false,
            "message": "Invalid OTP length. Must be exactly 5 digits."
          }`,
          `{
            "success": false,
            "message": "Incorrect or expired code"
          }`,
          `{
            "success": false,
            "message": "Too many verification attempts, please try again later."
          }`,
        ]}
        validations={[
          '`phoneNumber` and `code` are required.',
          '`code` must be exactly 5 digits.',
          '`requestId` is required if using Vonage.',
        ]}
      />

      {/* User registration */}
      <APIDocSection
        id="register"
        title="Register"
        method="POST"
        path="/auth/register"
        description="Registers a new user in Firebase and MongoDB. This is typically the final step after a user has verified their phone number. The endpoint automatically logs the new user in by returning access and refresh tokens."
        details={[
          'Creates a Firebase user via Admin SDK.',
          'Encrypts password using `bcryptjs`.',
          'Assigns a custom claim `role` in Firebase.',
          'Creates a Redis session and generates JWT access/refresh tokens.',
          'Stores user details in the appropriate MongoDB cluster based on role.',
          'Sends an email verification link via Resend.',
        ]}
        bodyParams={[
          {
            name: 'role',
            type: 'string',
            required: true,
            description: 'User role. Can be `customer` or `service-provider`.',
          },
          {
            name: 'email',
            type: 'string',
            required: true,
            description: 'A unique email address for the user.',
          },
          {
            name: 'password',
            type: 'string',
            required: true,
            description: 'User password, minimum 6 characters.',
          },
          {
            name: 'firstName',
            type: 'string',
            required: false,
            description:
              "User's first name. Either this and `lastName` or `displayName` are required.",
          },
          {
            name: 'lastName',
            type: 'string',
            required: false,
            description:
              "User's last name. Either this and `firstName` or `displayName` are required.",
          },
          {
            name: 'displayName',
            type: 'string',
            required: false,
            description: "User's full name. Used if `firstName` and `lastName` are not provided.",
          },
          {
            name: 'phoneNumber',
            type: 'string',
            required: true,
            description:
              "User's phone number in international format (e.g., +1...). It is strongly recommended this number is pre-verified via the OTP flow.",
          },
          {
            name: 'isAgreedTermsCondition',
            type: 'boolean',
            required: false,
            description: 'Defaults to `false`. Must be `true` to agree to terms and conditions.',
          },
          {
            name: 'dob',
            type: 'object',
            required: false,
            description:
              'Date of birth object: `{ day: number, month: number, year: number }`. **Required if `role` is `service-provider`**.',
          },
          {
            name: 'ssn_last_4',
            type: 'string',
            required: false,
            description:
              'Last 4 digits of Social Security Number. **Required if `role` is `service-provider`**.',
          },
        ]}
        requestBody={`{
          "role": "service-provider",
          "firstName": "Jane",
          "lastName": "Doe",
          "email": "jane.provider@example.com",
          "phoneNumber": "+16208036122",
          "password": "secret123",
          "isAgreedTermsCondition": true,
          "dob": {
            "day": 15,
            "month": 8,
            "year": 1990
          },
          "ssn_last_4": "1234"
        }`}
        successResponse={`{
          "success": true,
          "message": "User created. Verification email sent.",
          "data": {
            "uid": "firebase_uid",
            "role": "service-provider",
            "accountId": "mongo_object_id",
            "accessToken": "jwt_access_token",
            "refreshToken": "jwt_refresh_token"
          }
        }`}
        workflowSteps={[
          'Validates required fields. If role is `service-provider`, validates `dob` and `ssn_last_4`.',
          'Checks if a user with the given email already exists.',
          'Hashes password using bcrypt (`bcrypt.hash(password, 10)`).',
          'Creates a Firebase user with `admin.auth().createUser()`.',
          'Sets Firebase custom claims for `role`.',
          'Saves user in MongoDB via `createFirebaseUserDocument()`, including creating a Stripe customer ID.',
          'Initializes `linkedAccounts` and `activeAccount` fields.',
          'Creates a Redis session and issues JWTs for immediate login.',
          'Calls `syncFirebaseUser()` to replicate user data across clusters if needed.',
          'Sends verification email using Resend.',
        ]}
        errorResponses={[
          `{
            "success": false,
            "message": "User already exists."
          }`,
          `{
            "success": false,
            "message": "Invalid phone number format. Use international format (+123...)"
          }`,
          `{
            "success": false,
            "message": "Invalid date of birth."
          }`,
          `{
            "success": false,
            "message": "Error creating user"
          }`,
        ]}
      />

      {/* User login */}
      <APIDocSection
        id="login"
        title="Login"
        method="POST"
        path="/auth/login"
        description="Authenticates a user via email and password, initializes a Redis-backed session, and returns JWTs. Handles cross-role account linking dynamically."
        details={[
          'If a user attempts to log in as a `service-provider` but only has a `customer` account (or vice versa), the server returns a `409` with a link offer code. Retrying the request with `confirmLinkServiceProvider: true` safely provisions the missing role cluster record.',
          'Automatically synchronizes `emailVerified` status across all MongoDB clusters if one cluster or Firebase Auth marks it as verified.',
          'Checks for social login usage to prevent native password login if the account has no password set.',
          "Fetches the user's active `storeId` if their role is `service-provider`.",
        ]}
        bodyParams={[
          {
            name: 'role',
            type: 'string',
            required: true,
            description:
              'The application context role (`customer`, `service-provider`, or `organization`).',
          },
          {
            name: 'email',
            type: 'string',
            required: true,
            description: 'Registered email address.',
          },
          { name: 'password', type: 'string', required: true, description: 'Account password.' },
          {
            name: 'deviceInfo',
            type: 'string',
            required: false,
            description: 'Device/browser tracking string attached to the Redis session.',
          },
          {
            name: 'confirmLinkCustomer',
            type: 'boolean',
            required: false,
            description:
              'If true, confirms linking an existing `service-provider` profile to a new `customer` context.',
          },
          {
            name: 'confirmLinkServiceProvider',
            type: 'boolean',
            required: false,
            description:
              'If true, confirms linking an existing `customer` profile to a new `service-provider` context.',
          },
        ]}
        requestBody={`{
          "role": "service-provider",
          "email": "john@example.com",
          "password": "secret123",
          "deviceInfo": "Optional device details or user-agent string",
          "confirmLinkCustomer": true,
          "confirmLinkServiceProvider": true
        }`}
        successResponse={`{
          "success": true,
          "message": "auth.loginSuccess",
          "data": {
            "accessToken": "jwt_access_token",
            "refreshToken": "jwt_refresh_token",
            "uid": "firebase_uid",
            "role": "service-provider",
            "emailVerified": true,
            "displayName": "John Doe",
            "email": "john@example.com",
            "phoneNumber": "+16208036122",
            "activeAccountId": "store_id_123",
            "isSocialLogin": false,
            "isAgreedTermsCondition": true,
            "requiresSpKycCompletion": false,
            "requiresCreateProfile": false
          }
        }`}
        workflowSteps={[
          'Fetches Firebase Identity using `admin.auth().getUserByEmail`.',
          'Loads the user document from the target role MongoDB cluster.',
          'Validates the password using `bcrypt.compare`.',
          'Checks cross-role linking. If a row exists in another cluster but not the target cluster, offers or performs account linking based on confirmation flags.',
          'Synchronizes `emailVerified` to all clusters if any sibling row has it set to true.',
          'If `role` is `service-provider`, resolves the active store account ID.',
          'Creates a Redis session (`createSession`) tracking active account context.',
          'Issues a new `accessToken` and `refreshToken`.',
        ]}
        errorResponses={[
          `{
            "success": false,
            "message": "auth.missingRequiredFields"
          }`,
          `{
            "success": false,
            "message": "auth.userNotFoundFirebase"
          }`,
          `{
            "success": false,
            "message": "auth.userNotFoundMongo"
          }`,
          `{
            "success": false,
            "message": "auth.accountCreatedSocialLogin"
          }`,
          `{
            "success": false,
            "message": "auth.invalidPassword"
          }`,
          `{
            "success": false,
            "message": "auth.linkServiceProviderFromCustomerOffer",
            "error": {
              "code": "LINK_SP_FROM_CUSTOMER"
            }
          }`,
          `{
            "success": false,
            "message": "auth.linkCustomerFromSpOffer",
            "error": {
              "code": "LINK_CUSTOMER_FROM_SP"
            }
          }`,
        ]}
        validations={[
          '`role` is required and must be one of `customer`, `service-provider`, `organization`.',
          '`email` must be a valid and registered email.',
          '`password` is required.',
          'If the `code` in the error response is `LINK_SP_FROM_CUSTOMER`, the client should prompt the user to upgrade and retry with `confirmLinkServiceProvider: true`.',
        ]}
      />

      {/* Google sign-in */}
      <APIDocSection
        id="google-login"
        title="Google Login"
        method="POST"
        path="/auth/google-login"
        description="Authenticates a user via Google OAuth using an ID token. Creates a new user profile automatically if one doesn't exist, initializes a Redis-backed session, and returns JWTs."
        details={[
          'Automatically provisions both Firebase Auth and MongoDB records for first-time Google logins.',
          'Safely splits the Google account full name into `firstName` and `lastName`.',
          'Fires an asynchronous welcome email via Resend for newly registered users.',
          'Forces the database `emailVerified` flag to `true` if the Google payload confirms the email is verified.',
        ]}
        bodyParams={[
          {
            name: 'idToken',
            type: 'string',
            required: true,
            description: 'A valid Google OAuth ID Token retrieved from the client device.',
          },
          {
            name: 'role',
            type: 'string',
            required: true,
            description:
              'The application context role (`customer`, `service-provider`, or `organization`).',
          },
          {
            name: 'deviceInfo',
            type: 'string',
            required: false,
            description: 'Device/browser tracking string attached to the Redis session.',
          },
        ]}
        requestBody={`{
          "idToken": "google_id_token_here",
          "role": "customer",
          "deviceInfo": "Optional device details or user-agent string"
        }`}
        successResponse={`{
          "success": true,
          "message": "Google login successful.",
          "data": {
            "accessToken": "jwt_access_token",
            "refreshToken": "jwt_refresh_token",
            "uid": "firebase_uid",
            "role": "customer",
            "emailVerified": true,
            "displayName": "John Doe",
            "activeAccountId": "64f...a3c",
            "isNewSocialUser": false,
            "isSocialLogin": true,
            "isAgreedTermsCondition": true,
            "requiresSpKycCompletion": false
          }
        }`}
        workflowSteps={[
          'Validates the `idToken` securely using `google-auth-library` and the configured client IDs.',
          'Extracts `email`, `email_verified`, and `name`. Fails if the Google account has no email.',
          'Retrieves or provisions a Firebase user strictly by the provided email.',
          'Retrieves or provisions a MongoDB user document for the requested role (flagged as `isSocialLogin: true`).',
          'Triggers an asynchronous welcome email if a new user profile was just created.',
          'Synchronizes the `email_verified` state to the database before saving the active account context.',
          'Resolves the active store context for `service-provider` roles.',
          'Creates a Redis session (`createSession`), sets custom Firebase claims, and issues JWTs.',
        ]}
        errorResponses={[
          `{
            "success": false,
            "message": "auth.invalidLoginPayload"
          }`,
          `{
            "success": false,
            "message": "auth.googleAccountNoEmail"
          }`,
          `{
            "success": false,
            "message": "Invalid token signature (from google-auth-library)"
          }`,
        ]}
        validations={[
          '`idToken` must be a valid Google ID token.',
          '`role` is required and must be one of `customer`, `service-provider`, `organization`.',
          '`deviceInfo` is optional but recommended for session tracking.',
        ]}
      />

      {/* Apple sign-in */}
      <APIDocSection
        id="apple-login"
        title="Apple Login"
        method="POST"
        path="/auth/apple-login"
        description="Authenticates a user via Apple OAuth using an ID token. Securely verifies the token using Apple's JWKS, provisions a user profile if necessary, initializes a Redis session, and returns JWTs."
        details={[
          "Decodes and verifies the token signature against Apple's public keys (`https://appleid.apple.com/auth/keys`).",
          'Automatically provisions Firebase Auth and MongoDB records for first-time Apple sign-ins.',
          'Sends an asynchronous welcome email via Resend for newly created users.',
        ]}
        bodyParams={[
          {
            name: 'idToken',
            type: 'string',
            required: true,
            description: 'A valid Apple Identity Token retrieved from Sign in with Apple.',
          },
          {
            name: 'role',
            type: 'string',
            required: true,
            description:
              'The application context role (`customer`, `service-provider`, or `organization`).',
          },
          {
            name: 'deviceInfo',
            type: 'string',
            required: false,
            description: 'Device/browser tracking string attached to the Redis session.',
          },
        ]}
        requestBody={`{
          "idToken": "apple_jwt_id_token_here",
          "role": "customer",
          "deviceInfo": "Optional device details or user-agent string"
        }`}
        successResponse={`{
          "success": true,
          "message": "auth.appleLoginSuccess",
          "data": {
            "accessToken": "jwt_access_token",
            "refreshToken": "jwt_refresh_token",
            "uid": "firebase_uid",
            "role": "customer",
            "emailVerified": true,
            "displayName": "John Doe",
            "activeAccountId": "64f...a3c",
            "isNewSocialUser": false,
            "isSocialLogin": true,
            "isAgreedTermsCondition": true,
            "requiresSpKycCompletion": false
          }
        }`}
        workflowSteps={[
          'Decodes the `idToken` header to extract the `kid` (Key ID).',
          "Fetches Apple's public keys using `jwks-rsa` and verifies the token signature (`RS256`).",
          'Extracts the `email` from the payload (fails if Apple account has private relay without forwarding set up).',
          'Retrieves or creates the user in Firebase Auth.',
          'Retrieves or creates the user document in MongoDB (flagged as `authProvider: "apple"`).',
          'Synchronizes the `email_verified` state to the database.',
          'Resolves the active store context for `service-provider` roles.',
          'Generates a Redis session, sets Firebase custom claims, and issues JWT access and refresh tokens.',
        ]}
        errorResponses={[
          `{
            "success": false,
            "message": "auth.invalidLoginPayload"
          }`,
          `{
            "success": false,
            "message": "auth.invalidAppleToken"
          }`,
          `{
            "success": false,
            "message": "auth.appleAccountNoEmail"
          }`,
        ]}
        validations={[
          '`idToken` must be a valid, unexpired Apple Identity Token.',
          '`role` is required and must be one of `customer`, `service-provider`, `organization`.',
        ]}
      />

      {/* Refresh Token */}
      <APIDocSection
        id="refresh-token"
        title="Refresh Token"
        method="POST"
        path="/auth/refresh-token"
        description="Exchanges a valid, unexpired refresh token for a new set of access and refresh tokens. The session must be active in both Redis and the MongoDB refresh token collection."
        details={[
          'Verifies the refresh token signature and expiration.',
          'Looks up the token in the database by `uid` and `sessionId` to ensure it has not been revoked.',
          'Issues a completely new `accessToken` and `refreshToken` pair.',
          'Updates the database with the new tokens and extends the expiration date.',
        ]}
        bodyParams={[
          {
            name: 'refreshToken',
            type: 'string',
            required: true,
            description: 'The JWT refresh token issued during login or a previous refresh.',
          },
        ]}
        requestBody={`{ "refreshToken": "existing_jwt_refresh_token" }`}
        successResponse={`{
          "success": true,
          "message": "Tokens refreshed successfully.",
          "data": {
            "accessToken": "new_jwt_access_token",
            "refreshToken": "new_jwt_refresh_token"
          }
        }`}
        errorResponses={[
          `{
            "success": false,
            "message": "auth.missingRefreshToken"
          }`,
          `{
            "success": false,
            "message": "auth.invalidRefreshToken"
          }`,
          `{
            "success": false,
            "message": "auth.refreshTokenNotFoundOrRevoked"
          }`,
        ]}
      />

      {/* Switch Account */}
      <APIDocSection
        id="switch-account"
        title="Switch Account"
        method="POST"
        path="/auth/switch-account"
        description="Switches the user's active context (e.g., from a Customer profile to a Service Provider store). This endpoint validates permissions, updates the Redis session, and issues a new access token reflecting the new context."
        details={[
          'This endpoint requires authentication (Bearer token).',
          'It validates that the user has access to the `targetAccountId` via their `linkedAccounts` graph.',
          'If switching to a `customer` role for the first time from a `service-provider` account, it automatically provisions the customer profile.',
          'A new `accessToken` is issued, but the `refreshToken` remains the same.',
        ]}
        bodyParams={[
          {
            name: 'role',
            type: 'string',
            required: true,
            description: 'The target role to switch to (e.g., `service-provider`).',
          },
          {
            name: 'targetAccountId',
            type: 'string',
            required: true,
            description: 'The ID of the target account (e.g., a `storeId`).',
          },
        ]}
        requestBody={`{ "role": "service-provider", "targetAccountId": "store_id_123" }`}
        successResponse={`{
          "success": true,
          "message": "auth.switchedAccountSuccess",
          "data": {
            "uid": "firebase_uid",
            "role": "service-provider",
            "activeAccount": {
              "role": "service-provider",
              "id": "store_id_or_user_id"
            },
            "accessToken": "new_jwt_access_token",
            "isAgreedTermsCondition": true
          }
        }`}
        errorResponses={[
          `{
            "success": false,
            "message": "auth.missingSessionIdLoginAgain"
          }`,
          `{
            "success": false,
            "message": "auth.accessDeniedTargetAccount"
          }`,
        ]}
        validations={[
          'Requires Bearer authentication token in header.',
          '`role` and `targetAccountId` are required.',
          'User must have explicit access to `targetAccountId` in their `linkedAccounts` graph.',
        ]}
      />

      {/* Link Additional Role */}
      <APIDocSection
        id="link-additional-role"
        title="Link Additional Role"
        method="POST"
        path="/auth/link-role"
        description="Links a new role to an existing authenticated user (e.g., a Customer upgrading to a Service Provider). This endpoint provisions the new profile, syncs documents across databases, and issues new tokens."
        details={[
          'This endpoint requires authentication (Bearer token).',
          'If linking to `service-provider`, a default Store document is automatically generated.',
          'Re-issues a new `accessToken` and `refreshToken` pair reflecting the new role context.',
          'Invalidates Redis caches to ensure subsequent API calls reflect the new account structure.',
        ]}
        bodyParams={[
          {
            name: 'newRole',
            type: 'string',
            required: true,
            description: 'The new role to link to the user account (e.g., `service-provider`).',
          },
        ]}
        requestBody={`{ "newRole": "service-provider" }`}
        successResponse={`{
          "success": true,
          "message": "auth.linkedNewRole",
          "data": {
            "uid": "firebase_uid",
            "newRole": "service-provider",
            "accountId": "new_store_or_account_id",
            "accessToken": "new_jwt_access_token",
            "refreshToken": "new_jwt_refresh_token"
          }
        }`}
        errorResponses={[
          `{
            "success": false,
            "message": "auth.missingOrInvalidRequiredFields"
          }`,
          `{
            "success": false,
            "message": "auth.alreadyRegisteredAs"
          }`,
        ]}
        validations={[
          'Requires Bearer authentication token in header.',
          '`newRole` must be a valid role that is not currently linked.',
        ]}
      />

      {/* Forgot Password */}
      <APIDocSection
        id="forgot-password"
        title="Forgot Password"
        method="POST"
        path="/auth/forgot-password"
        description="Sends a password reset code to the user's email. This endpoint is rate-limited to prevent abuse."
        details={[
          'Rate Limited: Maximum 5 requests per 15 minutes per IP to prevent email enumeration and Resend API abuse.',
        ]}
        bodyParams={[
          {
            name: 'email',
            type: 'string',
            required: true,
            description: "The user's registered email address.",
          },
        ]}
        requestBody={`{ "email": "user@example.com" }`}
        successResponse={`{
          "success": true,
          "message": "Password reset code sent to email."
        }`}
        errorResponses={[
          `{
            "success": false,
            "message": "forgotPassword.tooManyRequests"
          }`,
          `{
            "success": false,
            "message": "User not found."
          }`,
          `{
            "success": false,
            "message": "Failed to send password reset code."
          }`,
        ]}
        validations={['`email` is required and must be a valid, registered email address.']}
      />

      {/* Reset Password */}
      <APIDocSection
        id="reset-password"
        title="Reset Password"
        method="POST"
        path="/auth/reset-password"
        description="Resets the user's password using a valid verification code. Updates the password in both Firebase Auth and the hashed password in the MongoDB user document."
        bodyParams={[
          {
            name: 'email',
            type: 'string',
            required: true,
            description: "The user's registered email address.",
          },
          {
            name: 'code',
            type: 'string',
            required: true,
            description: "The verification code sent to the user's email.",
          },
          {
            name: 'password',
            type: 'string',
            required: true,
            description: 'The new password for the account (minimum 6 characters).',
          },
        ]}
        requestBody={`{ "email": "user@example.com", "code": "123456", "password": "newStrongPassword123" }`}
        successResponse={`{
          "success": true,
          "message": "Password reset successfully."
        }`}
        errorResponses={[
          `{
            "success": false,
            "message": "Email, code, and password required."
          }`,
          `{
            "success": false,
            "message": "Invalid or expired verification code."
          }`,
          `{
            "success": false,
            "message": "User not found."
          }`,
          `{
            "success": false,
            "message": "Failed to reset password."
          }`,
        ]}
        validations={[
          '`email`, `code`, and `password` are all required.',
          '`password` must be at least 6 characters long.',
        ]}
      />

      {/* Logout */}
      <APIDocSection
        id="logout-user"
        title="Logout"
        method="POST"
        path="/auth/logout"
        description="Logs out the currently authenticated user by deleting their specific Redis session and invalidating the refresh token associated with that session."
        details={[
          'This endpoint requires authentication (Bearer token).',
          'It deletes the refresh token from MongoDB for the current `sessionId` only.',
          'It deletes the session data from Redis for the current `sessionId` only.',
          'Other active sessions on different devices will remain logged in.',
        ]}
        requestBody={`{
          // No body required, authentication token in headers
        }`}
        successResponse={`{
          "success": true,
          "message": "auth.userLoggedOutSuccess"
        }`}
        errorResponses={[
          `{
            "success": false,
            "message": "auth.missingSessionId"
          }`,
        ]}
        validations={['User must be authenticated with a valid Bearer token.']}
      />
    </APIDocLayout>
  );
}
