'use client';

import { APIDocLayout } from '@/components/docs/APIDocLayout';
import { APIDocSection } from '@/components/docs/APIDocSection';

export default function UsersDocsPage() {
  const sections = [
    { id: 'get-me', title: 'Get Current User (/me)' },
    { id: 'get-user-by-email', title: 'Get User by Email' },
    { id: 'update-user', title: 'Update User Profile' },
    { id: 'check-phone-available', title: 'Check Phone Availability' },
    { id: 'get-linked-accounts', title: 'Get Linked Accounts' },
    { id: 'remove-request', title: 'Request Account Removal' },
    { id: 'maps-autocomplete', title: 'Maps: Autocomplete' },
    { id: 'maps-details', title: 'Maps: Place Details' },
    { id: 'maps-reverse-geocode', title: 'Maps: Reverse Geocode' },
  ];

  return (
    <APIDocLayout
      title="User Account Management"
      description="Manage Zinga user profiles, cross-cluster synchronization, linked accounts graphs, and account deactivations."
      sections={sections}
    >
      {/* Get Current User */}
      <APIDocSection
        id="get-me"
        title="Get Current User"
        method="GET"
        path="/users/me"
        description="Retrieves the fully resolved, cross-cluster profile for the currently authenticated user based on their active Redis session."
        details={[
          'This endpoint is heavily cached using Redis (`redisCache`) to ensure high performance on repeated client mounts.',
          'Dynamically computes `requiresCreateProfile`, `requiresSpKycCompletion`, and `hasStoreServices` based on the active role context.',
          'If the user is logged in as a `customer` but a `service-provider` document exists, it automatically merges the KYC DOB into the response for UI consistency.',
          'Automatically aligns the `emailVerified` status with Firebase Auth and any sibling cluster roles if they are out of sync.',
        ]}
        requestBody={`// No body required. Pass authentication token in headers.
Headers: {
  "Authorization": "Bearer <accessToken>",
  "x-account-id": "store_id_123" // Optional: specify active store for SPs
}`}
        successResponse={`{
  "status": 0,
  "message": "user.detailsFetchedSuccess",
  "data": {
    "user": {
      "uid": "firebase_uid",
      "email": "user@example.com",
      "displayName": "Jane Doe",
      "role": "service-provider",
      "activeAccount": { "role": "service-provider", "id": "store_id_123" },
      "isAgreedTermsCondition": true,
      "requiresCreateProfile": false,
      "requiresSpKycCompletion": false,
      "hasStoreServices": true
    }
  }
}`}
        errorResponses={[
          `{ "status": 1, "message": "errors.unauthorized" }`,
          `{ "status": 1, "message": "user.invalidRoleModel" }`,
        ]}
        validations={['Requires Bearer token authentication.']}
        workflowSteps={[
          'Extracts `uid` and `role` from the verified JWT / Redis session.',
          'Loads the corresponding MongoDB user document.',
          'Repairs broken linked store arrays if they were accidentally cleared but rows exist.',
          'Computes KYC and onboarding completion statuses dynamically.',
          "Caches the resulting object in Redis (120s TTL) mapped to the user's specific version counter.",
        ]}
      />

      {/* Get user's details by email */}
      <APIDocSection
        id="get-user-by-email"
        title="Get User by Email"
        method="GET"
        path="/users/user-by-email"
        description="Fetches a user's complete profile cross-cluster using an email address."
        details={[
          'Looks up the user by email in Firebase Auth first, extracting the `uid`.',
          'Searches across all MongoDB role clusters using the Firebase `uid` to ensure it retrieves the most accurate, active document (avoids issues with stale duplicate-email rows).',
          'Results are cached in Redis for 30 seconds.',
        ]}
        requestBody={`// Query Parameters
GET /users/user-by-email?email=jane@example.com`}
        successResponse={`{
  "status": 0,
  "message": "user.detailsFetchedSuccess",
  "data": {
    "user": {
      "uid": "firebase_uid",
      "email": "jane@example.com",
      "displayName": "Jane Doe"
    }
  }
}`}
        errorResponses={[
          `{ "status": 1, "message": "user.emailRequired" }`,
          `{ "status": 1, "message": "user.userNotFoundFirebase" }`,
          `{ "status": 1, "message": "user.userNotFoundDb" }`,
        ]}
        validations={['`email` query parameter is strictly required.']}
      />

      {/* Update User */}
      <APIDocSection
        id="update-user"
        title="Update User Profile"
        method="PATCH"
        path="/users/update-user/:uid"
        description="Updates the user's profile information and perfectly synchronizes the changes across all linked role clusters (Customer, Service Provider, Organization)."
        details={[
          'Also accessible via `PUT /users/update/:uid`.',
          'Automatically builds and syncs the `displayName` if `firstName` or `lastName` are modified.',
          'Validates `phoneNumber` uniqueness across the entire system before saving.',
          'Invalidates Redis caches (and Chat caches if names change) so connected users see the fresh data immediately.',
        ]}
        bodyParams={[
          { name: 'firstName', type: 'string', required: false, description: "User's first name." },
          { name: 'lastName', type: 'string', required: false, description: "User's last name." },
          {
            name: 'phoneNumber',
            type: 'string',
            required: false,
            description: 'Must be globally unique.',
          },
          {
            name: 'avatar',
            type: 'string',
            required: false,
            description: "URL to the user's profile picture.",
          },
          {
            name: 'isAgreedTermsCondition',
            type: 'boolean',
            required: false,
            description: 'Accept platform terms.',
          },
          {
            name: 'language',
            type: 'string',
            required: false,
            description: 'Preferred language (`en` or `es`).',
          },
          {
            name: 'dob',
            type: 'object',
            required: false,
            description: 'KYC field: `{ day, month, year }`.',
          },
          {
            name: 'address',
            type: 'object',
            required: false,
            description: 'KYC field: `{ line1, city, state, postal_code, country }`.',
          },
          {
            name: 'ssn_last_4',
            type: 'string',
            required: false,
            description: 'KYC field: 4-digit string.',
          },
        ]}
        requestBody={`{
  "firstName": "Jane",
  "lastName": "Doe",
  "phoneNumber": "+16208036122",
  "dob": {
    "day": 15,
    "month": 8,
    "year": 1990
  }
}`}
        successResponse={`{
  "status": 0,
  "message": "user.detailsUpdated",
  "data": {
    "user": {
      "uid": "firebase_uid",
      "firstName": "Jane",
      "lastName": "Doe",
      "displayName": "Jane Doe"
    }
  }
}`}
        errorResponses={[
          `{ "status": 1, "message": "user.forbiddenCannotUpdateAnother" }`,
          `{ "status": 1, "message": "kyc.invalidDob" }`,
          `{ "status": 1, "message": "kyc.mustBe18" }`,
        ]}
        validations={[
          "The authenticated user's `uid` must match the `:uid` in the URL.",
          'If `phoneNumber` is provided, it is converted to E.164 international format before uniqueness checks.',
          'If KYC fields are passed, `dob` must resolve to a valid date ≥ 18 years ago, and `ssn_last_4` must be exactly 4 digits.',
        ]}
        workflowSteps={[
          'Validates requester authorization against the URL parameter.',
          'If KYC fields exist, strictly validates the payloads.',
          'If `phoneNumber` exists, checks uniqueness across all clusters.',
          'Applies updates to the active role document and saves it.',
          'Fires parallel background updates to synchronize the changes to any sibling documents (e.g. updating the Customer row if the user is currently editing their Service Provider profile).',
          'Invalidates all related Redis caches and bumps Chat participant versions.',
        ]}
      />

      {/* Check Phone Availability */}
      <APIDocSection
        id="check-phone-available"
        title="Check Phone Availability"
        method="POST"
        path="/users/check-phone-available"
        description="Verifies if a specific phone number is available for use before attempting a profile update or OTP verification."
        details={[
          'Checks across all role databases (Customer, Service Provider, Organization) to ensure the phone number is completely unused globally.',
          'Normalizes the phone number before checking.',
        ]}
        bodyParams={[
          {
            name: 'phoneNumber',
            type: 'string',
            required: true,
            description: 'The phone number to verify in E.164 format.',
          },
        ]}
        requestBody={`{
  "phoneNumber": "+16208036122"
}`}
        successResponse={`{
  "status": 0,
  "message": "user.phoneAvailableForProfileUpdate",
  "data": {
    "available": true
  }
}`}
        errorResponses={[
          `{ "status": 1, "message": "user.phoneNumberRequired" }`,
          `{ "status": 1, "message": "user.invalidPhone" }`,
          `{ "status": 1, "message": "auth.phoneAlreadyInUse" }`,
        ]}
      />

      {/* Get Linked Accounts */}
      <APIDocSection
        id="get-linked-accounts"
        title="Get Linked Accounts"
        method="GET"
        path="/users/linked-accounts/:uid"
        description="Fetches the full graph of a user's linked accounts, resolving and returning details for all active Stores and Organizations owned by the user."
        details={[
          "Crucial for populating 'Switch Account' dropdowns.",
          'Automatically filters out any Stores or Organizations that have been marked as inactive or deleted.',
          'Heavily cached in Redis (60s TTL).',
        ]}
        requestBody={`// No body required. Pass authentication token in headers.
GET /users/linked-accounts/firebase_uid`}
        successResponse={`{
  "status": 0,
  "message": "user.linkedAccountsFetchedSuccess",
  "data": {
    "accounts": {
      "customer": [
        {
          "uid": "firebase_uid",
          "email": "jane@example.com",
          "role": "customer"
        }
      ],
      "service-provider": [
        {
          "uid": "firebase_uid",
          "role": "service-provider",
          "stores": [
            {
              "storeId": "store_123",
              "storeName": "Jane's Salon",
              "isActive": true
            }
          ]
        }
      ]
    }
  }
}`}
        errorResponses={[`{ "status": 1, "message": "user.noLinkedAccountsFound" }`]}
        workflowSteps={[
          'Searches the Customer, Service Provider, and Organization collections for matching `uid`.',
          'For the Service Provider role, looks up the specific `Store` documents linked to the account.',
          'Filters out any deactivated entities.',
          'Constructs and returns the hierarchical graph.',
        ]}
      />

      {/* Remove Account / Store */}
      <APIDocSection
        id="remove-request"
        title="Request Account Removal"
        method="POST"
        path="/users/remove-request"
        description="Submits a request to delete an account, store, or organization. Handles automatic entity deactivation and session token revocation."
        details={[
          'If removing a `customer`, it deactivates the entire user profile.',
          'If removing a `service-provider` target (a Store), it deactivates the Store document. It will only deactivate the master FirebaseUser profile if they have zero active stores/orgs remaining.',
          'Revokes all Firebase refresh tokens to immediately terminate active mobile app sessions.',
        ]}
        bodyParams={[
          {
            name: 'reasonCategory',
            type: 'string',
            required: true,
            description: 'Enum: `too_expensive`, `privacy_concerns`, `other`, etc.',
          },
          {
            name: 'customReason',
            type: 'string',
            required: false,
            description: 'Optional detailed text.',
          },
          {
            name: 'targetId',
            type: 'string',
            required: false,
            description:
              'Required if deleting a Store or Organization. Omit if deleting the primary Customer account.',
          },
        ]}
        requestBody={`{
  "reasonCategory": "privacy_concerns",
  "customReason": "I no longer use this service.",
  "targetId": "store_123"
}`}
        successResponse={`{
  "status": 0,
  "message": "user.removeRequestSubmittedSuccess",
  "data": {
    "removeRequest": {
      "ownerUid": "firebase_uid",
      "targetId": "store_123",
      "processed": false
    }
  }
}`}
        errorResponses={[
          `{ "status": 1, "message": "user.reasonCategoryRequired" }`,
          `{ "status": 1, "message": "user.targetIdRequiredForSp" }`,
        ]}
        workflowSteps={[
          'Validates payload and checks if an identical pending request already exists.',
          'Saves the request to the `RemoveRequest` collection for admin auditing.',
          'Locates the target `Store` or `Organization` (if applicable) and marks it `isActive: false`.',
          'If no other active entities exist, marks the parent `FirebaseUser` doc as inactive.',
          'Clears Redis Caches and explicitly revokes Firebase Auth tokens to force session logout.',
        ]}
      />

      {/* Address Suggestions (Maps) */}
      <APIDocSection
        id="maps-autocomplete"
        title="Maps: Autocomplete"
        method="GET"
        path="/maps/autocomplete"
        description="Fetches real-time address suggestions from the Google Maps Places Autocomplete API based on partial user input. Supports optional country and geolocation filters for more relevant local results."
        requestBody={`// Query Parameters
GET /maps/autocomplete?input=221B+Baker+Street&country=us`}
        successResponse={`{
  "status": 0,
  "message": "Address suggestions fetched successfully",
  "data": [
    {
      "description": "221B Baker Street, London, UK",
      "placeId": "ChIJtV5bzSAFdkgRpwLZFPWrJgo"
    },
    {
      "description": "221B Baker Street, Los Angeles, CA, USA",
      "placeId": "ChIJw2mK3b-4woARa3hMZrGmTGY"
    }
  ]
}`}
        errorResponses={[
          `{ "status": 1, "message": "Missing input query" }`,
          `{ "status": 1, "message": "REQUEST_DENIED" }`,
        ]}
        validations={[
          '`input` query parameter is strictly required.',
          'Does not require authentication — public endpoint.',
          'Optionally supports filtering by `country`, `lat`, and `lng` for regional accuracy.',
          'Handles and relays Google API errors gracefully (e.g., `REQUEST_DENIED`, `OVER_QUERY_LIMIT`).',
        ]}
        workflowSteps={[
          'Constructs the Google Maps Autocomplete API request using the server-side secret key.',
          'Fetches results directly from Google Maps.',
          'Strips out excessive payload data to return only `description` and `placeId`.',
        ]}
      />

      {/* Place Details (Maps) */}
      <APIDocSection
        id="maps-details"
        title="Maps: Place Details"
        method="GET"
        path="/maps/details"
        description="Retrieves precise geographic details for a given Google Place ID using the Google Maps Place Details API. Returns the formatted address and coordinates (latitude and longitude)."
        requestBody={`// Query Parameters
GET /maps/details?placeId=ChIJtV5bzSAFdkgRpwLZFPWrJgo`}
        successResponse={`{
  "status": 0,
  "message": "Place details fetched successfully",
  "data": {
    "lat": 51.523767,
    "lng": -0.1585557,
    "address": "221B Baker Street, London NW1 6XE, UK",
    "components": [/* ...address_components array from Google... */],
    "types": ["premise"]
  }
}`}
        errorResponses={[
          `{ "status": 1, "message": "Missing placeId" }`,
          `{ "status": 1, "message": "INVALID_REQUEST" }`,
        ]}
        validations={[
          '`placeId` query parameter is required.',
          'No authentication required — public endpoint.',
          'Only requests the `geometry` and `formatted_address` fields from Google to minimize API billing costs.',
        ]}
        workflowSteps={[
          'Constructs the Google Maps Place Details API URL.',
          'Fetches the place details from the Google API.',
          'Extracts `geometry.location` and `formatted_address` from the heavy Google response.',
          'Returns the formatted address and coordinates.',
        ]}
      />

      {/* Reverse Geocode (Maps) */}
      <APIDocSection
        id="maps-reverse-geocode"
        title="Maps: Reverse Geocode"
        method="GET"
        path="/maps/reverse"
        description="Performs a reverse geocoding lookup, converting latitude and longitude coordinates into a human-readable address and its component parts."
        requestBody={`// Query Parameters
GET /maps/reverse?lat=51.523767&lng=-0.1585557`}
        successResponse={`{
  "status": 0,
  "message": "maps.reverseGeocodeFetchedSuccess",
  "data": {
    "formatted_address": "221B Baker St, London NW1 6XE, UK",
    "components": [
      { "long_name": "221B", "short_name": "221B", "types": ["street_number"] },
      { "long_name": "Baker Street", "short_name": "Baker St", "types": ["route"] },
      { "long_name": "London", "short_name": "London", "types": ["postal_town"] },
      { "long_name": "United Kingdom", "short_name": "GB", "types": ["country", "political"] }
    ]
  }
}`}
        errorResponses={[
          `{ "status": 1, "message": "maps.missingLatLng" }`,
          `{ "status": 1, "message": "ZERO_RESULTS" }`,
        ]}
        validations={[
          '`lat` and `lng` query parameters are required.',
          'No authentication required — public endpoint.',
        ]}
        workflowSteps={[
          'Calls the Google Maps Geocoding API with the provided coordinates.',
          'Returns the first and most relevant result from the response.',
        ]}
      />
    </APIDocLayout>
  );
}
