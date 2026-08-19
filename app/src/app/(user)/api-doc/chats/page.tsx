'use client';

import { APIDocLayout } from '@/components/docs/APIDocLayout';
import { APIDocSection } from '@/components/docs/APIDocSection';

export default function MessagesDocsPage() {
  const sections = [
    { id: 'create-chat', title: 'Create Chat' },
    { id: 'fetch-user-chats', title: 'Get User Chats' },
    { id: 'fetch-chat-details', title: 'Get Chat Details' },
    { id: 'add-message-to-chat', title: 'Add Message' },
    { id: 'fetch-chat-messages', title: 'Get Messages' },
    { id: 'clear-chat', title: 'Clear Chat History' },
    { id: 'end-chat', title: 'End Chat' },
    { id: 'delete-chat', title: 'Delete Chat' },
  ];

  return (
    <APIDocLayout
      title="Chats API"
      description="This section covers all APIs that enable real-time communication between users, including customers, service providers, and organizations.
Chats are stored in both MongoDB and Firebase Realtime Database to maintain persistence and live synchronization.
Each chat session supports creating conversations, sending messages, fetching histories, and managing chat lifecycle actions (like ending or deleting)."
      sections={sections}
    >
      {/* Create a new chat */}
      <APIDocSection
        id="create-chat"
        title="Create Chat"
        method="POST"
        path="/chats/create"
        description="Creates a new chat session between a customer and a service provider/organization. Automatically resolves sender identities and reactivates existing closed chats."
        details={[
          'If a chat between the same participants already exists and is `closed`, it reactivates the chat to `open` and clears out stale Firebase messages.',
          'Automatically resolves the sender to their `uid` (Customer/Org) or `storeId` (Service Provider).',
          'Invalidates all necessary Redis chat caches instantly upon creation.',
        ]}
        bodyParams={[
          {
            name: 'receiverUid',
            type: 'string',
            required: true,
            description: 'UID of the user you are messaging.',
          },
          {
            name: 'receiverRole',
            type: 'string',
            required: true,
            description: 'Role of the receiver (`customer`, `service-provider`, `organization`).',
          },
          {
            name: 'storeId',
            type: 'string',
            required: false,
            description: 'Required if communicating with a service provider or organization.',
          },
        ]}
        requestBody={`Headers: {
  "Authorization": "Bearer <accessToken>"
}

Body: {
  "receiverUid": "uid_5678",
  "receiverRole": "service-provider",
  "storeId": "STR_1234"
}`}
        successResponse={`{
  "status": 0,
  "message": "chat.chatCreatedSuccess",
  "data": {
    "chatId": "c13b2c44-6a8c-4e1b-bb73-c4b4acb29c6d",
    "users": [
      {
        "role": "customer",
        "uid": "uid_1234",
        "displayName": "John Doe"
      },
      {
        "role": "service-provider",
        "uid": "STR_1234",
        "displayName": "Elite Barber Studio"
      }
    ],
    "status": "open",
    "updatedAt": "2025-10-27T06:15:00.000Z"
  }
}`}
        errorResponses={[
          `{
  "status": 1,
  "message": "chat.senderReceiverRequired"
}`,
          `{
  "status": 1,
  "message": "chat.storeIdRequiredForSp"
}`,
          `{
  "status": 1,
  "message": "chat.serviceProviderStoreNotFound"
}`,
        ]}
        validations={[
          'Requires authentication (JWT token).',
          '`storeId` must be provided if the sender or receiver is a Service Provider.',
        ]}
        workflowSteps={[
          'Identify sender from authenticated user — determines role automatically (customer, service-provider, or organization).',
          'Validate receiver information (`receiverUid`, `receiverRole`, and `storeId` if needed).',
          'Check if a chat already exists between these two accounts.',
          'If found and closed → reopen chat; if open → return existing; otherwise → create a new chat.',
          'Save chat details in MongoDB and Firebase Realtime Database under `/chats/{chatId}`.',
          'Return chat details including `chatId`, participant info, and chat status.',
        ]}
      />

      {/* Fetch user's chats */}
      <APIDocSection
        id="fetch-user-chats"
        title="Get User Chats"
        method="GET"
        path="/chats/all"
        description="Fetches all chats for the authenticated user. Automatically scopes the query based on the user's active context (e.g., limiting to a specific store for Service Providers)."
        details={[
          'Fetches the core chat documents from MongoDB.',
          'Enriches the response with real-time metadata (latest message, online status) from Firebase Realtime Database using `enrichChatWithFirebase`.',
          'Supports organizations and multi-store providers via scoped IDs.',
        ]}
        requestBody={`// No body required. Pass authentication token in headers.`}
        successResponse={`{
  "status": 0,
  "message": "Chats fetched.",
  "data": [
    {
      "chatId": "c13b2c44-6a8c-4e1b-bb73-c4b4acb29c6d",
      "users": [
        {
          "uid": "uid_1234",
          "displayName": "John Doe",
          "photoURL": "https://cdn.example.com/avatars/john.png",
          "role": "customer"
        },
        {
          "uid": "uid_5678",
          "displayName": "Elite Barber Studio",
          "photoURL": "https://cdn.example.com/logos/barber123.png",
          "role": "service-provider"
        }
      ],
      "lastMessage": {
        "text": "Your appointment is confirmed!",
        "timestamp": "2025-10-27T06:10:00.000Z",
        "senderUid": "uid_5678"
      },
      "roles": {
        "customer": "uid_1234",
        "service-provider": "STR_1234"
      },
      "updatedAt": "2025-10-27T06:15:00.000Z"
    }
  ]
}`}
        errorResponses={[
          `{
  "status": 0,
  "message": "chat.noChatsFound"
}`,
        ]}
        validations={['Requires authentication (JWT token).']}
        workflowSteps={[
          'Resolves scoped IDs (`uid` for customers, `storeId`/`organizationId` for providers/orgs).',
          'Queries MongoDB for chats where the scoped ID is in the `users` array.',
          'Sorts results by `updatedAt` descending.',
          'For each chat, fetch additional info from Firebase (last message, roles, display names).',
        ]}
      />

      {/* Fetch chat details */}
      <APIDocSection
        id="fetch-chat-details"
        title="Get Chat Details"
        method="GET"
        path="/chats/details/:chatId"
        description="Fetches full details of a specific chat, including synchronized messages and participant info. Intentionally un-cached to ensure real-time accuracy."
        details={[
          'Validates that the requesting user is an active participant in the chat.',
          'Reads real-time messages directly from Firebase Database.',
          'Merges the static MongoDB chat record with dynamic Firebase data and fresh participant profiles.',
        ]}
        requestBody={`// No body required. Pass authentication token in headers.`}
        successResponse={`{
  "status": 0,
  "message": "chat.chatDetailsFetched",
  "data": {
    "chatId": "c13b2c44-6a8c-4e1b-bb73-c4b4acb29c6d",
    "users": [
      {
        "uid": "uid_1234",
        "displayName": "John Doe",
        "avatar": "https://cdn.example.com/avatars/john.png",
        "email": "john@example.com",
        "role": "customer"
      },
      {
        "uid": "uid_5678",
        "displayName": "Elite Barber Studio",
        "avatar": "https://cdn.example.com/logos/barber123.png",
        "email": "contact@elitebarber.com",
        "role": "service-provider"
      }
    ],
    "participants": [
      {
        "uid": "uid_1234",
        "displayName": "John Doe",
        "avatar": "https://cdn.example.com/avatars/john.png",
        "email": "john@example.com",
        "role": "customer"
      },
      {
        "uid": "uid_5678",
        "displayName": "Elite Barber Studio",
        "avatar": "https://cdn.example.com/logos/barber123.png",
        "email": "contact@elitebarber.com",
        "role": "service-provider"
      }
    ],
    "messages": [
      {
        "text": "Hey, I'm on my way!",
        "senderUid": "uid_1234",
        "timestamp": "2025-10-27T06:10:00.000Z"
      },
      {
        "text": "Perfect! See you soon.",
        "senderUid": "uid_5678",
        "timestamp": "2025-10-27T06:11:00.000Z"
      }
    ],
    "roles": {
      "customer": "uid_1234",
      "service-provider": "STR_1234"
    },
    "status": "active",
    "updatedAt": "2025-10-27T06:15:00.000Z"
  }
}`}
        errorResponses={[
          `{
  "status": 1,
  "message": "chat.missingChatId"
}`,
          `{
  "status": 1,
  "message": "chat.notFound"
}`,
          `{
  "status": 1,
  "message": "chat.notAParticipant"
}`,
        ]}
        validations={[
          '`chatId` must be provided as a route parameter.',
          'User must be a participant in the chat to access its details.',
        ]}
        workflowSteps={[
          'Extract `chatId` from request parameters and `uid` from the authenticated user.',
          'Find chat in MongoDB by `chatId`.',
          'Validate that requesting user is one of the participants using `isUserParticipant()`.',
          'Fetch chat metadata and message history from Firebase Realtime Database.',
          'For each participant, fetch display name, avatar, and email from the corresponding model based on role.',
          'Merge enhanced participant info into the response.',
          'Return chat details including users, roles, messages, and participants.',
        ]}
      />

      {/* Add message to chat */}
      <APIDocSection
        id="add-message-to-chat"
        title="Add Message"
        method="POST"
        path="/chats/addmsg"
        description="Sends a new message in an existing chat. It writes the message simultaneously to MongoDB and Firebase Realtime Database."
        details={[
          'Sender details (like Store Name or Organization Name) are resolved dynamically on the backend to prevent spoofing.',
          'Bumps the Redis version for both `chatDetails` and `chatMessages` instantly.',
        ]}
        bodyParams={[
          {
            name: 'chatId',
            type: 'string',
            required: true,
            description: 'The unique ID of the chat.',
          },
          {
            name: 'message',
            type: 'string',
            required: true,
            description: 'The text content of the message.',
          },
        ]}
        requestBody={`{
  "chatId": "c13b2c44-6a8c-4e1b-bb73-c4b4acb29c6d",
  "message": "Hello, I'd like to confirm my booking for today."
}`}
        successResponse={`{
  "status": 0,
  "message": "chat.messageSent",
  "data": {
    "messageId": "uid_1234_1730000000000",
    "sender": "uid_1234",
    "senderDisplayName": "John Doe",
    "text": "Hello, I'd like to confirm my booking for today.",
    "timestamp": "2025-10-27T06:30:00.000Z"
  }
}`}
        errorResponses={[
          `{
  "status": 1,
  "message": "chatId and message are required."
}`,
          `{
  "status": 1,
  "message": "chat.notFound"
}`,
          `{
  "status": 1,
  "message": "Sender not found."
}`,
        ]}
        validations={['The chat must exist and the sender must be a participant in it.']}
        workflowSteps={[
          'Determine sender UID or store/organization ID based on `req.userRole`.',
          'Fetch sender details (name, account ID, etc.) from the corresponding collection.',
          'Construct new message object with unique `messageId` and timestamp.',
          'Push message to Firebase Realtime Database and MongoDB in parallel.',
          'Bump Redis cache versions.',
        ]}
      />

      {/* Fetch all chat messages */}
      <APIDocSection
        id="fetch-chat-messages"
        title="Get Messages"
        method="POST"
        path="/chats/getmsg"
        description="Retrieves all messages for a specific chat directly from Firebase Realtime Database."
        details={[
          'Uses a POST request instead of GET due to real-time volatility.',
          'Filters out any messages that were sent *before* the user triggered a "Clear Chat" action (using the local `clearedAtBy` timestamp).',
        ]}
        bodyParams={[
          {
            name: 'chatId',
            type: 'string',
            required: true,
            description: 'The unique ID of the chat.',
          },
        ]}
        requestBody={`{
  "chatId": "c13b2c44-6a8c-4e1b-bb73-c4b4acb29c6d"
}`}
        successResponse={`{
  "status": 0,
  "message": "chat.messagesFetchedSuccess",
  "data": [
    {
      "messageId": "uid_1234_1730000000000",
      "sender": "uid_1234",
      "senderDisplayName": "John Doe",
      "text": "Hello, I'd like to confirm my booking for today.",
      "timestamp": "2025-10-27T06:30:00.000Z"
    },
    {
      "messageId": "store_5678_1730000012000",
      "sender": "store_5678",
      "senderDisplayName": "Elite Barber Studio",
      "text": "Sure! Your booking is confirmed for 3 PM.",
      "timestamp": "2025-10-27T06:31:00.000Z"
    }
  ]
}`}
        errorResponses={[
          `{
  "status": 1,
  "message": "chatId is required."
}`,
          `{
  "status": 1,
  "message": "chat.notFound"
}`,
        ]}
        validations={['The user must be a participant of the chat to fetch its messages.']}
        workflowSteps={[
          'Identifies the accountId from the authenticated user.',
          'Checks the chat document for `clearedAtBy.[accountId]`.',
          'Fetches the raw message list from Firebase.',
          'Filters out any messages older than the `clearedAtBy` timestamp and returns the rest.',
        ]}
      />

      {/* Clear the chat */}
      <APIDocSection
        id="clear-chat"
        title="Clear Chat History"
        method="DELETE"
        path="/chats/clear/:chatId"
        description="Hides the chat history for the requesting user without deleting the messages for the other participant."
        details={[
          'This does **not** delete messages from Firebase or MongoDB.',
          'It sets a `clearedAtBy` timestamp for the specific user in MongoDB. Subsequent calls to `/chats/getmsg` will filter out messages older than this timestamp.',
        ]}
        requestBody={`// No body required. Pass authentication token in headers.`}
        successResponse={`{
  "status": 0,
  "message": "chat.chatMessagesCleared"
}`}
        errorResponses={[
          `{
  "status": 1,
  "message": "chat.missingChatId"
}`,
          `{
  "status": 1,
  "message": "chat.notFound"
}`,
          `{
  "status": 1,
  "message": "chat.notAParticipant"
}`,
        ]}
        validations={['User must be a valid participant in the chat to perform this action.']}
        workflowSteps={[
          'Determine `accountId` based on user role.',
          'Updates the MongoDB document setting `clearedAtBy.[accountId]` to `Date.now()`.',
          'Updates the `updatedAt` timestamp in Firebase to trigger list re-renders.',
          'Bumps Redis versions for messages and chat details.',
        ]}
      />

      {/* End the chat */}
      <APIDocSection
        id="end-chat"
        title="End Chat"
        method="POST"
        path="/chats/end/:chatId"
        description="Closes the chat permanently. This action deletes all messages from Firebase and clears the history for *both* participants."
        requestBody={`// No body required. Pass authentication token in headers.`}
        successResponse={`{
  "status": 0,
  "message": "chat.chatEnded"
}`}
        errorResponses={[
          `{
  "status": 1,
  "message": "chat.missingChatId"
}`,
          `{
  "status": 1,
  "message": "chat.notFound"
}`,
          `{
  "status": 1,
  "message": "chat.notAParticipant"
}`,
        ]}
        validations={['Only existing chats can be ended.']}
        workflowSteps={[
          'Sets `clearedAtBy` for ALL participants in the chat document.',
          'Sets `status: "closed"` and records `closedAt`.',
          'Removes all actual messages from the Firebase Database.',
          'Bumps versions for all participants.',
        ]}
      />

      {/* Delete a chat */}
      <APIDocSection
        id="delete-chat"
        title="Delete Chat"
        method="DELETE"
        path="/chats/delete/:chatId"
        description="Deletes a chat entirely from the platform. The chat document is removed from MongoDB and its node is removed from Firebase."
        requestBody={`// No body required. Pass authentication token in headers.`}
        successResponse={`{
  "status": 0,
  "message": "chat.chatDeletedSuccess"
}`}
        errorResponses={[
          `{
  "status": 1,
  "message": "chat.missingChatId"
}`,
          `{
  "status": 1,
  "message": "chat.notFound"
}`,
          `{
  "status": 1,
  "message": "chat.notAParticipant"
}`,
        ]}
        validations={['User must be a valid participant in the chat.']}
        workflowSteps={[
          'Delete the chat and its messages from Firebase Realtime Database.',
          'Delete the chat record from MongoDB using `findOneAndDelete()`.',
          'Bump cache versions for all participants.',
        ]}
      />
    </APIDocLayout>
  );
}
