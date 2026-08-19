'use client';

import { APIDocLayout } from '@/components/docs/APIDocLayout';
import { APIDocSection } from '@/components/docs/APIDocSection';

export default function MiddlewareDocsPage() {
  const sections = [
    { id: 'auth-jwt-middleware', title: 'Auth JWT Middleware' },
    { id: 'require-dashboard-access', title: 'Dashboard Access' },
    { id: 'rate-limiting', title: 'Rate Limiting' },
    { id: 'error-handling', title: 'Error Handling' },
    { id: 'redis-caching', title: 'Redis Caching' },
  ];

  return (
    <APIDocLayout
      title="API Middleware"
      description="Core middleware that provides authentication, security, and consistent behavior across the Zinga API."
      sections={sections}
    >
      {/* Auth JWT Middleware */}
      <APIDocSection
        id="auth-jwt-middleware"
        title="Auth JWT Middleware"
        method="MIDDLEWARE"
        path="verifyJWT"
        description="This is the primary middleware for protecting authenticated routes. It verifies the JWT access token, validates the session against Redis, and attaches user and account context to the request object."
        details={[
          'The middleware expects an `Authorization` header with the format `Bearer <accessToken>`.',
          'It decodes the JWT and extracts the `uid` and `sessionId`.',
          '**Redis is the source of truth**: The `sessionId` is used to look up the active session in Redis. If the session does not exist or is invalid, the request is rejected.',
          "It intelligently resolves the user's `effectiveRole` and `accountId` from the token, Redis session, and optional `x-user-role` and `x-account-id` headers.",
          'For `service-provider` and `organization` roles, it strictly validates that the user has access to the provided `x-account-id`.',
          'On success, it attaches `req.user`, `req.userRole`, `req.accountId`, and `req.session` for use in downstream controllers.',
        ]}
        requestBody={`{
          // This middleware is applied to protected routes.
          // Client must provide the following headers:
          "Authorization": "Bearer <accessToken>",
          "x-account-id": "store_or_org_id" // Required for provider/org roles
        }`}
        successResponse={`{
          // If verification is successful, the middleware calls next().
          // The following properties are attached to the Express 'req' object:
          "user": { "...user document from MongoDB..." },
          "userRole": "customer",
          "accountId": "user_uid_or_store_id",
          "sessionId": "session_uuid_from_token",
          "tokenRole": "customer",
          "session": { "...full session payload from Redis..." }
        }`}
        errorResponses={[
          `{
            "status": 1,
            "message": "Unauthorized. No token provided."
          }`,
          `{
            "status": 1,
            "message": "Session expired or revoked."
          }`,
          `{
            "status": 1,
            "message": "Invalid or expired token."
          }`,
          `{
            "status": 1,
            "message": "Store not linked to this user."
          }`,
        ]}
      />

      {/* Require Dashboard Access */}
      <APIDocSection
        id="require-dashboard-access"
        title="Require Dashboard Access"
        method="MIDDLEWARE"
        path="requireDashboardAccess"
        description="Restricts access to specific routes (typically admin or dashboard APIs) based on allowed roles. It is intended to be used after the `verifyJWT` middleware."
        details={[
          'Reads the allowed roles from the `DASHBOARD_ALLOWED_ROLES` environment variable. If not set, it defaults to `"service-provider, organization"`.',
          "Extracts the user's role from `req.userRole` or `req.user.role` (which is populated beforehand by `verifyJWT`).",
          'If the role is missing or not included in the allowed list, it halts the request and returns a `403 Forbidden` response.',
        ]}
        errorResponses={[
          `// Role is not permitted
          {
            "message": "Forbidden: dashboard access denied"
          }
        `,
        ]}
        validations={['Must be placed after `verifyJWT` in the route middleware chain.']}
      />

      {/* Rate Limiting */}
      <APIDocSection
        id="rate-limiting"
        title="Rate Limiting"
        method="MIDDLEWARE"
        path="rateLimiter"
        description="Certain public endpoints are protected by a Redis-backed rate limiter to prevent abuse and brute-force attacks. This is crucial in a serverless environment where in-memory stores are ineffective."
        details={[
          'Uses `express-rate-limit` with `rate-limit-redis` to share counters across all serverless instances.',
          "Limits are based on the client's IP address.",
          'If a client exceeds the limit, the API will respond with a `429 Too Many Requests` error.',
        ]}
        workflowSteps={[
          '`otpSendLimiter`: 5 requests per 10 minutes. Protects `/auth/send-otp`.',
          '`otpVerifyLimiter`: 10 attempts per 10 minutes. Protects `/auth/verify-otp`.',
          '`forgotPasswordLimiter`: 5 requests per 15 minutes. Protects `/auth/forgot-password`.',
        ]}
        errorResponses={[
          `// Example for /auth/forgot-password
          {
            "status": 429,
            "message": "forgotPassword.tooManyRequests"
          }
        `,
        ]}
      />

      {/* Error Handling */}
      <APIDocSection
        id="error-handling"
        title="Central Error Handling"
        method="MIDDLEWARE"
        path="errorHandler"
        description="All API errors are processed by a central error handler to ensure a consistent response format. It also handles internationalization (i18n) for error messages."
        details={[
          'Catches all errors thrown from controllers and other middleware.',
          "If an error message is a translation key (e.g., `auth.invalidPassword`), it uses `i18next` to return the message in the user's requested language (`en` by default).",
          'Handles specific database connection errors by returning a `503 Service Unavailable` with a `Retry-After` header.',
        ]}
        successResponse={`// Standard error response structure
        {
          "status": 1,
          "message": "Translated error message here.",
          "data": { /* Optional additional error context */ }
        }`}
      />

      {/* Redis Caching */}
      <APIDocSection
        id="redis-caching"
        title="Redis Caching"
        method="MIDDLEWARE"
        path="redisCache"
        description="A sophisticated caching middleware for GET requests to improve performance and reduce database load. It includes features like stampede protection and cache bypassing."
        details={[
          'Only applies to `GET` requests.',
          'Uses a Redis lock to prevent cache stampedes (multiple requests for the same uncached resource).',
          'Responses include an `x-cache` header with values like `HIT`, `MISS`, `MISS-LOCKED`, or `BYPASS-ERROR`.',
          'The cache can be intentionally bypassed for a request by adding the `?noCache=1` query parameter or the `x-no-cache: 1` request header.',
        ]}
        workflowSteps={[
          'A unique cache key is generated based on the request (URL, params, user role, etc.).',
          'The middleware first attempts to retrieve the response from Redis.',
          'If a `HIT`, it returns the cached data immediately.',
          'If a `MISS`, it acquires a lock, proceeds to the controller, and caches the successful response before sending it.',
          'If the lock is already taken (`MISS-LOCKED`), it proceeds to the controller but does not write to the cache, letting the original request handle it.',
        ]}
      />
    </APIDocLayout>
  );
}
