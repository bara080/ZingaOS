'use client';

import { APIDocLayout } from '@/components/docs/APIDocLayout';
import { APIDocSection } from '@/components/docs/APIDocSection';

export default function BookingsDocsPage() {
  const sections = [
    { id: 'search-services', title: 'Search & Create Request' },
    { id: 'get-user-bookings', title: 'Get User Bookings' },
    { id: 'get-store-bookings', title: 'Get Store Bookings' },
    { id: 'get-booking-details', title: 'Get Booking Details' },
    { id: 'respond-booking', title: 'Respond to Booking' },
    { id: 'connect-provider', title: 'Connect to Provider' },
    { id: 'check-connection', title: 'Check Connection Status' },
    { id: 'complete-booking', title: 'Complete Booking' },
  ];

  return (
    <APIDocLayout
      title="Bookings & Service Requests API"
      description="This section covers all API endpoints related to the booking lifecycle — from searching for available stores and services to managing requests, connections, and completions.
The Bookings API enables seamless interaction between customers and service providers, handling everything from discovery to final service completion."
      sections={sections}
    >
      {/* Search & Create Request */}
      <APIDocSection
        id="search-services"
        title="Search & Create Request"
        method="POST"
        path="/search/services"
        description="Searches for nearby stores based on geospatial location, category, and filters, then automatically creates a unified Service Request and broadcasts it to all matching candidates."
        details={[
          'This is a complex aggregate endpoint. It does not just return stores; it initiates the entire booking lifecycle.',
          'It uses the Haversine formula to filter stores within the specified `distance` (converted to miles internally).',
          'Instantly sends push notifications and in-app alerts to all matching service providers.',
        ]}
        bodyParams={[
          {
            name: 'query',
            type: 'string',
            required: true,
            description: 'Search term for service title or description.',
          },
          {
            name: 'category',
            type: 'string',
            required: true,
            description: 'The service category enum.',
          },
          {
            name: 'serviceType',
            type: 'string',
            required: true,
            description: '`home` or `store`.',
          },
          {
            name: 'distance',
            type: 'number',
            required: true,
            description: 'Search radius in miles.',
          },
          {
            name: 'serviceLocation',
            type: 'object',
            required: true,
            description: '`{ lat, lng }` coordinates.',
          },
          {
            name: 'dateTime',
            type: 'string',
            required: true,
            description: 'ISO 8601 scheduled date/time.',
          },
          { name: 'priceRange', type: 'object', required: true, description: '`{ min, max }`' },
          {
            name: 'ratings',
            type: 'number',
            required: false,
            description: 'Minimum required rating.',
          },
          {
            name: 'jobsDone',
            type: 'number',
            required: false,
            description: 'Minimum required completed jobs.',
          },
        ]}
        requestBody={`{
  "query": "Haircut",
  "category": "Barber Services",
  "serviceType": "store",
  "distance": 10,
  "serviceLocation": { "lat": 40.7128, "lng": -74.0060 },
  "dateTime": "2025-10-30T14:00:00Z",
  "priceRange": { "min": 10, "max": 100 }
}`}
        successResponse={`{
  "status": 0,
  "message": "search.serviceRequestCreatedSuccess",
  "data": {
    "bookingId": "000124",
    "requestId": "uuid-request-id",
    "totalCandidates": 3
  }
}`}
        errorResponses={[
          `{
  "status": 1,
  "message": "search.queryOrCategoryMissing"
}`,
          `{
  "status": 1,
  "message": "search.invalidScheduledDateTime"
}`,
          `{
  "status": 1,
  "message": "search.noMatchingStoresFound"
}`,
        ]}
        validations={[
          'Requires authentication (JWT token).',
          '`dateTime` must be a valid future timestamp.',
        ]}
        workflowSteps={[
          'Fetches all active stores and applies Haversine geospatial filtering.',
          'Filters by category, service type availability, price range, ratings, and job counts.',
          'Builds a candidate list containing all matching service subdocuments.',
          'Generates a sequential `bookingId` using a MongoDB Counter.',
          'Wraps everything in a Mongoose Transaction to ensure data consistency.',
          'Invalidates Redis caches FIRST, then syncs the request to Firebase Realtime Database (to prevent stale client refetches).',
          'Fires notifications to all candidate service providers.',
        ]}
      />

      {/* Get User Bookings */}
      <APIDocSection
        id="get-user-bookings"
        title="Get User Bookings"
        method="GET"
        path="/bookings/all"
        description="Fetches all bookings associated with the authenticated account. Works dynamically for both Customers and Service Providers based on their JWT role."
        details={[
          'Cached in Redis for 180 seconds, tied to a version key that bumps instantly on any booking update.',
          'If the requester is a Service Provider, it automatically formats the response to mask bookings where a different candidate was selected (marks them as `canceled` for the unselected provider).',
        ]}
        requestBody={`// Query Parameters
GET /bookings/all?page=1`}
        successResponse={`{
  "status": 0,
  "message": "Bookings fetched successfully",
  "data": {
    "bookings": [
      {
        "_id": "671bdcc68e9d12f0a37f0d3a",
        "requestId": "REQ_00123",
        "customerUid": "CUS_1009",
        "category": "Beauty Salon Services",
        "status": "completed",
        "serviceType": "home",
        "scheduledAt": "2025-02-14T10:00:00.000Z",
        "selectedCandidate": {
          "storeId": "STR_9001",
          "ownerUid": "OWN_3005",
          "serviceId": "65efbb7a39e2a11e40a21a1f"
        },
        "priceRange": { "min": 500, "max": 1500 },
        "isCustomerConnected": true,
        "hasReview": false,
        "createdAt": "2025-02-10T08:15:24.000Z",
        "updatedAt": "2025-02-14T11:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "pages": 3,
      "hasNext": true
    }
  }
}`}
        errorResponses={[
          `{
  "status": 1,
  "message": "Access denied: unsupported user role."
}`,
          `{
  "status": 1,
  "message": "Internal server error."
}`,
        ]}
        validations={[
          'Requires authentication (JWT token).',
          '`page` parameter is optional (default: 1).',
        ]}
        workflowSteps={[
          'Constructs query based on `req.userRole`.',
          'Executes paginated MongoDB queries in parallel using `Promise.all`.',
          'Sanitizes the response array to hide selected competitor info from unselected service providers.',
        ]}
      />

      {/* Get Store Bookings */}
      <APIDocSection
        id="get-store-bookings"
        title="Get Store Bookings"
        method="GET"
        path="/bookings/store/:storeId"
        description="Fetches all bookings specifically associated with a given store. Useful for multi-store owners to view bookings on a per-store basis."
        details={[
          'Cached in Redis for 180 seconds.',
          'Dynamically enriches candidate data with the latest `servicePhoto` and `serviceTitle` from the Store document if missing (heals synchronization gaps).',
        ]}
        requestBody={`// No body required. Pass authentication token in headers.`}
        successResponse={`{
  "status": 0,
  "message": "booking.storeBookingsFetchedSuccess",
  "data": {
    "bookings": [ /* Array of bookings */ ]
  }
}`}
        errorResponses={[
          `{ "status": 1, "message": "booking.missingStoreId" }`,
          `{ "status": 1, "message": "booking.accessDeniedNotStoreOwner" }`,
        ]}
        validations={['The authenticated user must own the requested `storeId`.']}
      />

      {/* Fetch booking details */}
      <APIDocSection
        id="get-booking-details"
        title="Get Booking Details"
        method="GET"
        path="/bookings/:requestId"
        description="Fetches the comprehensive details for a single booking request, seamlessly resolving related customer, store, service, payment, and dispute information into a single response."
        requestBody={`// No body required. Pass authentication token in headers.`}
        successResponse={`{
  "status": 0,
  "message": "Booking details fetched",
  "data": {
    "booking": {
      "_id": "671bdcc68e9d12f0a37f0d3a",
      "requestId": "REQ_00123",
      "customerUid": "CUS_1009",
      "status": "completed",
      "serviceType": "home",
      "scheduledAt": "2025-02-14T10:00:00.000Z",
      "category": "Beauty Salon Services",
      "priceRange": { "min": 500, "max": 1500 },
      "candidates": [
        {
          "storeId": "STR_9001",
          "ownerUid": "OWN_3005",
          "serviceId": "65efbb7a39e2a11e40a21a1f",
          "status": "accepted",
          "respondedAt": "2025-02-12T09:00:00.000Z"
        }
      ],
      "selectedCandidate": {
        "storeId": "STR_9001",
        "ownerUid": "OWN_3005",
        "serviceId": "65efbb7a39e2a11e40a21a1f"
      },
      "store": {
        "storeId": "STR_9001",
        "storeName": "Elite Hair Studio",
        "storeLogo": "https://cdn.example.com/store-logos/elitehair.png",
        "storeCategory": "Beauty Salon Services",
        "location": {
          "address": "21 Maple Street",
          "city": "New York",
          "state": "NY",
          "country": "USA",
          "zipcode": "10001"
        }
      },
      "service": {
        "_id": "65efbb7a39e2a11e40a21a1f",
        "serviceTitle": "Hair Styling",
        "serviceDescription": "Professional hair styling service.",
        "duration": "45 mins",
        "inStorePrice": 1200,
        "inHomePrice": 1500
      },
      "customer": {
        "uid": "CUS_1009",
        "displayName": "Jane Doe",
        "email": "jane.doe@example.com",
        "phoneNumber": "+1-555-987-6543",
        "avatar": "https://cdn.example.com/avatars/jane.jpg"
      },
      "createdAt": "2025-02-10T08:15:24.000Z",
      "updatedAt": "2025-02-14T11:00:00.000Z"
    }
  }
}`}
        errorResponses={[
          `{
  "status": 1,
  "message": "booking.requestIdRequired"
}`,
          `{
  "status": 1,
  "message": "booking.notFound"
}`,
        ]}
        validations={['`requestId` is a required path parameter.']}
        workflowSteps={[
          'Locates the core `ServiceRequest` document.',
          'Extracts `selectedCandidate` (or falls back to an accepted candidate).',
          'Loads the physical `Store` and `Service` subdocument associated with the candidate.',
          'Fetches any associated `Payment` and dynamically calculates `disputeEligibility`.',
          'Returns the fully populated, unified response object.',
        ]}
      />

      {/* Respond to Booking */}
      <APIDocSection
        id="respond-booking"
        title="Respond to Booking"
        method="PATCH"
        path="/bookings/respond"
        description="Updates a booking request status. Shared across customers and providers. It handles granular state transitions (accept, reject, cancel, complete) securely based on role."
        details={[
          'Instantly synchronizes state to Firebase Realtime Database to push live updates to mobile clients.',
          'Triggers relevant localized push notifications using `i18next`.',
        ]}
        bodyParams={[
          {
            name: 'requestId',
            type: 'string',
            required: true,
            description: 'The unique booking ID.',
          },
          {
            name: 'status',
            type: 'string',
            required: true,
            description: '`accepted`, `rejected`, `canceled`, or `completed`.',
          },
          {
            name: 'cancelReason',
            type: 'string',
            required: false,
            description: 'Required if rejecting or canceling.',
          },
        ]}
        requestBody={`{
  "requestId": "REQ_00123",
  "status": "accepted"
}`}
        successResponse={`{
  "status": 0,
  "message": "booking.requestStatusProcessed"
}`}
        errorResponses={[
          `{
  "status": 1,
  "message": "booking.invalidRequestData"
}`,
          `{
  "status": 1,
  "message": "booking.notAuthorizedToRespond"
}`,
          `{
  "status": 1,
  "message": "booking.cannotCancelPaidRequest"
}`,
        ]}
        validations={[
          'If status is `rejected` or `canceled`, `cancelReason` must be provided.',
          'Cannot cancel an already paid request.',
        ]}
        workflowSteps={[
          'Enforces state machine logic (e.g., rejecting before connect vs. canceling after connect).',
          'Updates candidate arrays or the master request status accordingly.',
          'Bumps Redis versions for affected users and stores.',
          'Syncs changes to Firebase RTDB (`service_requests` and `users/.../service_requests`).',
          'Dispatches dynamic notifications.',
        ]}
      />

      {/* Connect to Provider */}
      <APIDocSection
        id="connect-provider"
        title="Connect to Provider"
        method="POST"
        path="/bookings/connect"
        description="Locks in a specific service provider for a request. Cancels all other candidates and transitions the booking to an `accepted` active state."
        details={[
          'Only accessible by Customers.',
          'Automatically copies a full snapshot of the selected store and service into the `selectedCandidate` field to guard against future price or info changes.',
        ]}
        bodyParams={[
          { name: 'requestId', type: 'string', required: true, description: '' },
          { name: 'storeId', type: 'string', required: true, description: '' },
          { name: 'ownerUid', type: 'string', required: true, description: '' },
          { name: 'serviceId', type: 'string', required: true, description: '' },
        ]}
        requestBody={`{
  "requestId": "REQ_00123",
  "storeId": "STORE_0001",
  "ownerUid": "sp_UID_123",
  "serviceId": "671b4efb9c7a213a4dcda812"
}`}
        successResponse={`{
  "status": 0,
  "message": "booking.providerConnected"
}`}
        errorResponses={[
          `{
  "status": 1,
  "message": "booking.alreadyConnected"
}`,
          `{
  "status": 1,
  "message": "booking.matchingCandidateNotFound"
}`,
        ]}
        workflowSteps={[
          'Validates the candidate belongs to the request.',
          'Generates the permanent `selectedCandidate` snapshot.',
          'Updates flags and maps all unselected candidates to `canceled`.',
          'Bumps Redis versions FIRST.',
          'Overwrites the Firebase Realtime Database node with a cleaned payload.',
        ]}
      />

      {/* Check Connection Status */}
      <APIDocSection
        id="check-connection"
        title="Check Connection Status"
        method="GET"
        path="/bookings/is-connected/:requestId"
        description="A lightweight endpoint to rapidly check if a customer has locked in a connection for a specific booking request."
        requestBody={`// No body required. Pass authentication token in headers.`}
        successResponse={`{
  "status": 0,
  "message": "booking.connectionStatus",
  "data": {
    "isConnected": true,
    "selectedCandidate": { /* ... */ }
  }
}`}
        errorResponses={[
          `{
  "status": 1,
  "message": "booking.requestIdRequired"
}`,
        ]}
      />

      {/* Complete Booking */}
      <APIDocSection
        id="complete-booking"
        title="Complete Booking"
        method="POST"
        path="/bookings/complete"
        description="Marks a service booking as finalized. Enforces payment prerequisites and increments service fulfillment stats."
        details={[
          'Can be triggered by either the customer or the accepted service provider.',
          'Cleans up the Firebase Realtime Database payload for the request after a 3000ms delay to free up node space.',
          'Triggers the post-booking email and push notifications (prompting tips/reviews).',
        ]}
        bodyParams={[
          { name: 'requestId', type: 'string', required: true, description: 'The booking ID.' },
        ]}
        requestBody={`{
  "requestId": "REQ_00123"
}`}
        successResponse={`{
  "status": 0,
  "message": "booking.completedSuccess"
}`}
        errorResponses={[
          `{
  "status": 1,
  "message": "booking.cannotCompleteBeforePayment"
}`,
          `{
  "status": 1,
  "message": "booking.onlyCustomerOrProviderCanComplete"
}`,
        ]}
        validations={['A valid payment record must exist before marking a booking as completed.']}
      />
    </APIDocLayout>
  );
}
