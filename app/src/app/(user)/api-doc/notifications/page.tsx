'use client';

import { APIDocLayout } from '@/components/docs/APIDocLayout';
import { APIDocSection } from '@/components/docs/APIDocSection';

export default function NotificationsDocsPage() {
  const sections = [
    { id: 'create-notification', title: 'Create a notification' },
    { id: 'get-all-notifications', title: 'Get all notifications' },
    { id: 'mark-notification-as-read', title: 'Mark as read' },
    { id: 'mark-all-notifications-as-read', title: 'Mark all as read' },
    { id: 'clear-all-notifications', title: 'Clear all notifications' },
    { id: 'save-push-token', title: 'Save Push Token' },
    { id: 'send-push-notification', title: 'Send Push Notification' },
  ];

  return (
    <APIDocLayout
      title="Notifications API"
      description="This API manages platform notifications for all user roles — customers, service providers, and organizations. It allows fetching, marking as read, and clearing notifications, ensuring users stay informed about bookings, payments, reviews, and system updates. The same endpoint dynamically determines the user's role (based on the JWT) to return the correct notification list."
      sections={sections}
    >
      {/* Create a notofication */}
      <APIDocSection
        id="create-notification"
        title="Create a notification"
        method="INTERNAL"
        path="createNotification(uid, title, body, role, extra?, storeId?)"
        description="This internal service method creates and syncs a notification across MongoDB and Firebase Realtime Database. It is not exposed as a public REST endpoint — instead, it’s called internally whenever an event (like booking, payment, or review) occurs that requires a notification to be sent."
        requestBody={`Arguments:
  uid: string                // Firebase user ID of the receiver
  title: string              // Fallback title (e.g., 'Payment Completed')
  body: string               // Fallback message body
  role: 'customer' | 'service-provider' | 'organization'
  extra?: object             // Optional fields (type, requestId, titleKey, bodyKey, etc.)
  storeId?: string | null    // Only for service providers`}
        successResponse={`{
  "_id": "67225b7d81e43200125fbb23",
  "uid": "user_123",
  "storeId": "store_456",
  "role": "service-provider",
  "title": "Payment Successful",
  "body": "Your payment is completed.",
  "titleKey": "notifications.payment.title",
  "bodyKey": "notifications.payment.body",
  "bodyParams": {
    "amount": 1500
  },
  "isRead": false,
  "type": "request",
  "requestId": "req_67890",
  "createdAt": "2025-10-27T09:15:23.452Z",
  "updatedAt": "2025-10-27T09:15:23.452Z"
}`}
        errorResponses={[
          `{
  "message": "Error creating notification: ValidationError"
}`,
        ]}
        validations={[
          'This is an internal method, not a direct HTTP endpoint.',
          'Requires a valid `uid` and `role` to determine which notification model to use.',
          'For service providers, a `storeId` must be provided or derived from the active account.',
          'Supports `titleKey` and `bodyKey` for dynamic client-side internationalization (i18n).',
          'Supports a `key` field to prevent duplicate notifications (e.g., for idempotent cron jobs like app updates).',
          'Automatically saves notification in MongoDB for persistence.',
          'Mirrors the created notification in Firebase Realtime Database for instant delivery.',
        ]}
        workflowSteps={[
          'Logs the attempt context to Sentry (for error tracking).',
          'Select correct notification model using `getNotificationModel(role)`.',
          'Create a new document in MongoDB with the provided details.',
          'Determine the Firebase reference (`notifications/{uid or storeId}/{_id}`).',
          'Push the notification object to Firebase for real-time syncing.',
          'Bumps the Redis notifications cache version instantly to invalidate the list.',
          'Return the newly created MongoDB document to the caller.',
        ]}
      />

      {/* Get all notifications */}
      <APIDocSection
        id="get-all-notifications"
        title="Get all notifications"
        method="GET"
        path="/notifications"
        description="Fetches all notifications for the authenticated user. This endpoint supports multiple roles (customer, service provider, and organization) using a single unified route. The backend automatically determines which notifications to return based on the user's role and active account context."
        details={[
          'Cached in Redis for 180 seconds. The cache is automatically invalidated when new notifications are created, marked as read, or cleared.',
        ]}
        requestBody={`Headers: {
  "Authorization": "Bearer <accessToken>"
}

Optional Query Params:
  storeId: "store_12345"   // (only for service providers)
`}
        successResponse={`{
  "status": 0,
  "message": "notification.fetchSuccess",
  "data": {
    "notifications": [
      {
        "_id": "671c3b2b7e9d9b0012a9c431",
        "uid": "user_789",
        "storeId": "store_12345",
        "role": "service-provider",
        "title": "New Booking Received",
        "body": "You have a new booking request from John Doe.",
        "isRead": false,
        "type": "request",
        "requestId": "req_7890",
        "createdAt": "2025-10-27T08:20:31.293Z",
        "updatedAt": "2025-10-27T08:20:31.293Z"
      },
      {
      }
    ]
  }
}`}
        errorResponses={[
          `{
  "status": 1,
  "message": "errors.badRequest"
}`,
          `{
  "status": 1,
  "message": "Internal server error"
}`,
        ]}
        validations={[
          'Requires authentication (JWT token).',
          'The `storeId` is resolved via query param or inferred from the active account context.',
          'Notifications are sorted by `createdAt` in descending order.',
          'Supports both read and unread notifications.',
          'Response format is consistent across roles.',
        ]}
        workflowSteps={[
          'Validate JWT and extract `uid` and `role`.',
          'If user is a service provider, determine `storeId` from either query params or `activeAccount`.',
          'Check Redis for a cached response using a versioned key. If a miss, query MongoDB.',
          'Sort notifications by `createdAt` (latest first).',
          'Return the notifications list in structured format.',
        ]}
      />

      {/* Mark notification as read */}
      <APIDocSection
        id="mark-notification-as-read"
        title="Mark as read"
        method="PATCH"
        path="/notifications/:id/read"
        description="Marks a specific notification as read for the logged-in user or service provider. Updates both MongoDB and Firebase Realtime Database to keep states synchronized across devices."
        details={['Invalidates the Redis notifications cache instantly.']}
        requestBody={`Headers: {
  "Authorization": "Bearer <accessToken>"
}

Params:
  id: string  // Notification ID to mark as read
`}
        successResponse={`{
  "status": 0,
  "message": "notification.markReadSuccess",
  "data": {
    "_id": "67225b7d81e43200125fbb23",
    "uid": "user_123",
    "role": "customer",
    "title": "Payment Successful",
    "body": "Your payment for Booking #A123 is completed.",
    "isRead": true,
    "type": "payment",
    "createdAt": "2025-10-27T09:15:23.452Z",
    "updatedAt": "2025-10-27T09:18:12.012Z"
  }
}`}
        errorResponses={[
          `{
  "status": 1,
  "message": "notification.notFound"
}`,
          `{
  "status": 1,
  "message": "errors.badRequest"
}`,
        ]}
        validations={[
          'Requires a valid JWT — user must be logged in.',
          'For service providers, the filter uses `storeId` instead of `uid`.',
          'Updates both MongoDB (persistent) and Firebase (real-time sync).',
        ]}
        workflowSteps={[
          'Extract `uid`, `role`, and `notificationId` from request.',
          'Resolve the correct model with `getNotificationModel(role)`.',
          'Find the matching notification (by `_id` and `uid` or `storeId`).',
          'Set `isRead = true` and save in MongoDB.',
          'Update the same field in Firebase under `notifications/{firebaseUid}/{notificationId}`.',
          'Bump Redis notifications cache version.',
          'Return the updated notification object.',
        ]}
      />

      {/* Mark all notifications as read */}
      <APIDocSection
        id="mark-all-notifications-as-read"
        title="Mark all as read"
        method="PATCH"
        path="/notifications/read-all"
        description="Marks all unread notifications as read for the logged-in user or service provider. This operation updates both MongoDB and Firebase to ensure all devices reflect the updated read state."
        successResponse={`{
  "status": 0,
  "message": "notification.markAllReadSuccess"
}`}
        errorResponses={[
          `{
  "status": 1,
  "message": "errors.badRequest"
}`,
          `{
  "status": 1,
  "message": "Internal server error"
}`,
        ]}
        validations={[
          'Requires user authentication (JWT).',
          'Determines whether to use `uid` (for customers) or `storeId` (for service providers).',
          'Updates all notifications in MongoDB where `isRead: false`.',
          'Iterates through Firebase nodes and updates all child `isRead` flags to `true`.',
        ]}
        workflowSteps={[
          'Extract `uid` and `role` from authenticated user.',
          'Identify correct filter (`uid` or `storeId`).',
          'Run `updateMany` in MongoDB to mark all as read.',
          'Fetch all Firebase notification nodes for this user.',
          'Batch update all `isRead` fields to `true` in Firebase.',
          'Bump Redis cache versions.',
          'Respond with a success message.',
        ]}
      />

      {/* Clear all notifications */}
      <APIDocSection
        id="clear-all-notifications"
        title="Clear all notifications"
        method="DELETE"
        path="/notifications/clear-all"
        description="Deletes all notifications for the authenticated user or service provider. This action permanently removes records from both MongoDB and Firebase Realtime Database."
        successResponse={`{
  "status": 0,
  "message": "notification.clearAllSuccess"
}`}
        errorResponses={[
          `{
  "status": 1,
  "message": "errors.badRequest"
}`,
          `{
  "status": 1,
  "message": "Internal server error"
}`,
        ]}
        validations={[
          'Requires user authentication via JWT.',
          "Determines correct notification model based on user's role.",
          'Uses `uid` for customers and `storeId` for service providers.',
          'Deletes all notification records from MongoDB using `deleteMany(filter)`.',
          'Removes all related notification nodes from Firebase under `notifications/{firebaseUid}`.',
        ]}
        workflowSteps={[
          'Extract `uid` and `role` from the authenticated user.',
          'Resolve the correct model with `getNotificationModel(role)`.',
          'Construct a filter based on user role (either `uid` or `storeId`).',
          'Run `Notification.deleteMany(filter)` to clear all documents in MongoDB.',
          'Remove the corresponding Firebase node using `ref.remove()`.',
          'Bump Redis cache versions to reflect an empty list immediately.',
          'Respond with success message confirming all notifications cleared.',
        ]}
      />

      {/* Save Push Token */}
      <APIDocSection
        id="save-push-token"
        title="Save Push Token"
        method="POST"
        path="/push-notification/save-push-token"
        description="Stores or updates a user's Expo Push Token to enable receiving push notifications on their mobile device. Tokens are deduplicated and synced across both customer and service provider clusters."
        bodyParams={[
          {
            name: 'expoPushToken',
            type: 'string',
            required: true,
            description: 'Expo push token provided by the mobile client.',
          },
          {
            name: 'platform',
            type: 'string',
            required: false,
            description: "Device platform (e.g., 'ios', 'android').",
          },
        ]}
        successResponse={`{
  "status": 0,
  "message": "pushNotification.pushTokenSynced"
}`}
        errorResponses={[
          `{
  "status": 1,
  "message": "pushNotification.expoPushTokenRequired"
}`,
          `{
  "status": 1,
  "message": "Internal server error"
}`,
        ]}
        validations={[
          'Requires user authentication via JWT to access `req.user.uid`.',
          'Expo Push Token must be provided in the request body.',
          "Token is saved for both 'customer' and 'service-provider' roles.",
          'Duplicate tokens are removed using `$pull` before adding via `$addToSet`.',
          'Each token entry includes platform and timestamp metadata.',
        ]}
        workflowSteps={[
          'Extract `uid` from the authenticated request.',
          'Validate `expoPushToken` from request body.',
          'Iterate over both roles (customer, service-provider) to sync token.',
          'Remove any existing duplicates from Mongo using `$pull`.',
          'Insert or update token with `$addToSet` to prevent duplicates.',
          'Return success response confirming synchronization.',
        ]}
      />

      {/* Send Push Notification */}
      <APIDocSection
        id="send-push-notification"
        title="Send Push Notification"
        method="INTERNAL"
        path="sendPushNotification"
        description="Sends a push notification via the Expo Push Notification Service to one or multiple user devices. Supports chunked delivery, platform-specific configuration, and receipt verification."
        bodyParams={[
          {
            name: 'expoPushTokens',
            type: 'array',
            required: true,
            description: 'List of Expo push tokens or token objects `{ token, platform }`.',
          },
          {
            name: 'title',
            type: 'string',
            required: true,
            description: 'Notification title text.',
          },
          { name: 'body', type: 'string', required: true, description: 'Notification body text.' },
          {
            name: 'data',
            type: 'object',
            required: false,
            description: 'Custom data payload sent along with the notification.',
          },
        ]}
        successResponse={`{
  "message": "Notifications sent successfully (logged via Expo chunks and receipts)."
}`}
        errorResponses={[
          `{
  "message": "No Expo Push Tokens available."
}`,
          `{
  "message": "Error sending chunk or fetching receipts."
}`,
        ]}
        validations={[
          'Uses Expo SDK to validate and send push tokens.',
          'Filters invalid tokens with `Expo.isExpoPushToken()`.',
          'Groups notifications into chunks using `expo.chunkPushNotifications()`.',
          'Sends notifications asynchronously with platform-specific options.',
          'Retrieves and logs delivery receipts for error tracking.',
        ]}
        workflowSteps={[
          'Normalize incoming tokens into structured objects.',
          "Filter valid tokens using Expo's token validator.",
          'Create notification payloads with sound/channel configs per platform.',
          "Chunk payloads and send via Expo's push API in batches.",
          'Collect ticket IDs and fetch receipts to verify successful delivery.',
        ]}
      />
    </APIDocLayout>
  );
}
