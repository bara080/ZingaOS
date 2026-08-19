'use client';

import { APIDocLayout } from '@/components/docs/APIDocLayout';
import { APIDocSection } from '@/components/docs/APIDocSection';

export default function ServiceProviderDocsPage() {
  const sections = [
    { id: 'create-store', title: 'Create Store' },
    { id: 'get-all-stores', title: 'Get All Stores' },
    { id: 'get-store-by-id', title: 'Get Store by ID' },
    { id: 'update-store', title: 'Update Store' },
    { id: 'delete-store', title: 'Delete Store' },
    { id: 'upload-store-media', title: 'Upload Store Media' },
    { id: 'get-all-media', title: 'Get All Media' },
    { id: 'get-media-by-id', title: 'Get Media by ID' },
    { id: 'update-media', title: 'Update Media' },
    { id: 'delete-media', title: 'Delete Media' },
    { id: 'get-sp-dashboard', title: 'Fetch SP Dashboard' },
    { id: 'get-store-reviews', title: 'Fetch store reviews' },
  ];

  return (
    <APIDocLayout
      title="Service Provider API"
      description="This section contains all API endpoints available for service providers to manage their stores, services, media, and related operations. Service providers can create new stores, update store details, manage store media, and access store-specific data. Each endpoint includes request and response formats, validations, and error handling information."
      sections={sections}
    >
      {/* Create Store */}
      <APIDocSection
        id="create-store"
        title="Create Store"
        method="POST"
        path="/stores/create"
        description="Creates a new store for the authenticated service provider. This endpoint handles store creation, links it to the user, and initiates a Stripe Connect account for payment processing."
        requestBody={`{
          "storeLogo": "https://example.com/logo.png", // optional
          "storeName": "Awesome Barber Shop",
          "storeCategory": "Barber Services", // required enum
          "storeDescription": "Premium barber services in downtown",
          "location": {
            "address": "123 Main St",
            "city": "Mumbai",
            "state": "MH",
            "country": "India",
            "zipcode": "400001",
            "lat": 19.076,
            "lng": 72.8777
          },
          "storeMedia": [
            {
              "url": "https://example.com/media1.jpg",
              "title": "Store Front",
              "description": "Our main entrance",
              "type": "image"
            }
          ], // optional
          "isFreelancer": false,
          "isAgreedTermsCondition": true
        }`}
        successResponse={`{
          "status": 0,
          "message": "Store created and Stripe onboarding initiated.",
          "data": {
            "storeId": "uuid-generated-store-id",
            "onboardingLink": "https://connect.stripe.com/onboarding/..."
          }
        }`}
        errorResponses={[
          `{
              "status": 1,
              "message": "store.missingRequiredFields"
            }`,
          `{
              "status": 1,
              "message": "store.userNotFoundFirebase"
            }`,
          `{
              "status": 1,
              "message": "store.storeWithNameExists"
            }`,
        ]}
        validations={[
          'Authenticated service provider is required (Bearer token).',
          'storeName, storeCategory, and location are mandatory fields.',
          'Duplicate store names for the same owner are not allowed.',
        ]}
        details={[
          'A Stripe Express account is automatically created and linked to the new store.',
          'The response includes a Stripe `onboardingLink` which the user must visit to complete their Stripe setup.',
          'If the user does not have a `service-provider` profile in MongoDB, one is automatically created based on their existing user data.',
          'Invalidates multiple Redis caches to ensure the new store appears immediately in subsequent API calls.',
        ]}
      />

      {/* Get All Stores */}
      <APIDocSection
        id="get-all-stores"
        title="Get All Stores"
        method="GET"
        path="/stores/all"
        description="Fetches all stores owned by the currently authenticated service provider."
        details={[
          'This endpoint is cached in Redis for 180 seconds. The cache is automatically invalidated when a store is created, updated, or deleted.',
        ]}
        requestBody={`// No body required. Pass authentication token in headers.`}
        successResponse={`{
          "status": 0,
          "message": "store.storesFetchedSuccess",
          "data": {
            "stores": [
              {
                "storeId": "store-uuid-1",
                "storeName": "Awesome Barber Shop",
                "owner": "user-uid-123"
              }
            ]
          }
        }`}
        validations={['Requires Bearer token authentication.']}
      />

      {/* Get SP Dashboard data */}
      <APIDocSection
        id="get-sp-dashboard"
        title="Fetch SP Dashboard"
        method="GET"
        path="/sp/dashboard/:storeId?filter=week|month|year|lifetime"
        description="Fetches the complete Service Provider (SP) dashboard data including today's booking counts, filtered booking trends, revenue, wallet balance, and Stripe account verification status."
        requestBody={`Params: {
  "storeId": "STORE_456"
}
Query: {
  "filter": "week" // options: 'week', 'month', 'year', 'lifetime'
}`}
        successResponse={`{
  "status": 0,
  "message": "Service provider dashboard fetched",
  "data": {
    "todaysCounts": {
      "pending": 2,
      "accepted": 3,
      "rejected": 1,
      "canceled": 0,
      "completed": 4
    },
    "dataBySelectingPeriod": {
      "revenue": {
        "received": 1450,
        "pending": 230
      },
      "bookingsByPeriod": [
        { "totalRequests": 10, "accepted": 4, "completed": 3, "rejected": 2, "canceled": 1 },
        { "totalRequests": 8, "accepted": 3, "completed": 2, "rejected": 2, "canceled": 1 }
      ],
      "labels": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      "filter": "week"
    },
    "store": {
      "_id": "678b0e2a...",
      "storeId": "STORE_456",
      "storeName": "Elite Car Wash",
      "ownerUid": "SP_2345",
      "createdAt": "2024-02-10T07:32:00.000Z",
      "status": "active"
    },
    "stripeStatus": {
      "account": {
        "id": "acct_1O9k2k9x...",
        "email": "owner@elitecarwash.com",
        "payouts_enabled": true,
        "charges_enabled": true
      },
      "onboardingComplete": true,
      "requirements": {
        "currently_due": [],
        "eventually_due": [],
        "past_due": [],
        "pending_verification": []
      }
    },
    "wallet": {
      "balance": 420,
      "pendingBalance": 180,
      "currency": "usd"
    }
  }
}`}
        errorResponses={[
          `{
  "status": 1,
  "message": "storeId is required"
}`,
          `{
  "status": 1,
  "message": "Store not found"
}`,
          `{
  "status": 1,
  "message": "Something went wrong while fetching dashboard data."
}`,
        ]}
        validations={[
          'The `storeId` parameter is mandatory.',
          'The `filter` query can be one of: week, month, year, lifetime.',
          'The store must exist in the database; otherwise a 404 is returned.',
          'Wallet and Stripe info are included only if properly linked to the store.',
        ]}
        workflowSteps={[
          'Validate that `storeId` is provided.',
          'Fetch store details (excluding heavy service/media arrays).',
          "Fetch wallet balance for the store's service provider account.",
          'Filter bookings based on the selected time range (`week`, `month`, `year`, `lifetime`).',
          "Count today's bookings across all 5 statuses.",
          'Compute period-wise booking stats (accepted, completed, rejected, canceled).',
          'Calculate total revenue and pending amounts from the Payment collection.',
          'Fetch Stripe account details and any missing requirements.',
          'Return aggregated dashboard data including wallet, revenue, Stripe, and store info.',
        ]}
      />

      {/* Get Store details */}
      <APIDocSection
        id="get-store-by-id"
        title="Get Store by ID"
        method="GET"
        path="/stores/:storeId"
        description="Fetches a single store by its `storeId`. This endpoint returns all key store details except the heavy `storeMedia` array, making it optimized for quick loads."
        details={['This endpoint is cached in Redis for 180 seconds.']}
        requestBody={`// No body required. Pass authentication token in headers.`}
        successResponse={`{
          "status": 0,
          "message": "Store fetched successfully.",
          "data": {
            "store": {
              "storeId": "uuid-store-id",
              "storeName": "Awesome Barber Shop",
              "storeLogo": "https://example.com/logo.png",
              "storeCategory": "Barber Services",
              "storeDescription": "Premium barber services in downtown",
              "location": {
                "address": "123 Main St",
                "city": "Mumbai",
                "state": "MH",
                "country": "India",
                "zipcode": "400001",
                "lat": 19.076,
                "lng": 72.8777
              },
              "services": [
                {
                  "_id": "670abc...",
                  "serviceName": "Haircut",
                  "price": 500,
                  "duration": 30
                }
              ],
              "owner": "uid-of-service-provider",
              "stripeAccountId": "acct_123456789",
              "isFreelancer": false,
              "isActive": true,
              "createdAt": "2024-01-25T10:00:00.000Z",
              "updatedAt": "2024-02-10T14:00:00.000Z"
            }
          }
        }`}
        errorResponses={[
          `{
              "status": 1,
              "message": "store.notFound"
            }`,
          `{
              "status": 1,
              "message": "Internal server error" // Generic fallback
            }`,
        ]}
        validations={[
          'Requires Bearer token authentication.',
          'Valid storeId must be provided as a URL parameter.',
          'storeMedia field is intentionally excluded to optimize performance.',
          "If the store does not exist, returns a 404 error with 'Store not found.' message.",
        ]}
      />

      {/* Update store details */}
      <APIDocSection
        id="update-store"
        title="Update Store"
        method="PUT"
        path="/stores/:storeId"
        description="Updates the details of an existing store. Only the store owner can perform this action."
        requestBody={`{
  "storeName": "New Barber Lounge",
  "storeDescription": "Now offering premium grooming experiences.",
  "storeLogo": "https://example.com/new-logo.png",
  "location": {
    "address": "456 New Road",
    "city": "Pune",
    "state": "MH",
    "country": "India",
    "zipcode": "411001",
    "lat": 18.5204,
    "lng": 73.8567
  },
  "isActive": true
}`}
        successResponse={`{
          "status": 0,
          "message": "Store updated successfully.",
          "data": {
            "store": {
              "storeId": "uuid-store-id",
              "storeName": "New Barber Lounge",
              "storeDescription": "Now offering premium grooming experiences.",
              "storeLogo": "https://example.com/new-logo.png",
              "storeCategory": "Barber Services",
              "location": {
                "address": "456 New Road",
                "city": "Pune",
                "state": "MH",
                "country": "India",
                "zipcode": "411001",
                "lat": 18.5204,
                "lng": 73.8567
              },
              "owner": "uid-of-service-provider",
              "isActive": true,
              "updatedAt": "2025-10-25T12:00:00.000Z"
            }
          }
        }`}
        errorResponses={[
          `{
              "status": 1,
              "message": "store.notFound"
            }`,
          `{
              "status": 1,
              "message": "store.unauthorizedToUpdate"
            }`,
          `{
              "status": 1,
              "message": "Internal server error" // Generic fallback
            }`,
        ]}
        validations={[
          'Requires Bearer token authentication.',
          'Only the store owner (req.user.uid) can update their store.',
          'Valid storeId must be provided in the URL parameter.',
          'All fields in the body are optional and will only overwrite provided values.',
          'Unauthorized requests will result in a 403 error.',
        ]}
        details={[
          'This action invalidates multiple Redis caches for the store, its owner, and linked accounts to ensure data consistency.',
        ]}
      />

      {/* Add a Photo/Viedeo */}
      <APIDocSection
        id="upload-store-media"
        title="Upload Store Media"
        method="POST"
        path="/stores/:storeId/media"
        description="Uploads a new image or video to a store's media gallery. Only the store owner can perform this action."
        requestBody={`{
  "title": "Interior of the salon",
  "description": "Showcasing the new ambience and styling stations.",
  "url": "https://example.com/media/interior.jpg",
  "type": "image"
}

`}
        successResponse={`{
  "status": 0,
  "message": "Media uploaded successfully.",
  "data": {
    "mediaItem": {
      "title": "Interior of the salon",
      "description": "Showcasing the new ambience and styling stations.",
      "url": "https://example.com/media/interior.jpg",
      "type": "image",
      "createdAt": "2025-10-27T10:00:00.000Z"
    }
  }
}`}
        errorResponses={[
          `{
      "status": 1,
      "message": "store.titleAndUrlRequired"
    }`,
          `{
      "status": 1,
      "message": "store.invalidMediaType"
    }`,
          `{
      "status": 1,
      "message": "store.notFound"
    }`,
          `{
      "status": 1,
      "message": "store.unauthorizedToUploadMedia"
    }`,
        ]}
        validations={[
          'Requires Bearer token authentication.',
          'Only the store owner can upload media.',
          'Title and URL fields are mandatory.',
          "Type must be either 'image' or 'video'. Defaults to 'image' if not provided.",
          "Uploads are saved directly to the store’s 'storeMedia' array.",
        ]}
        details={['This action invalidates the Redis caches for the store and its media.']}
      />

      {/* Update store media */}
      <APIDocSection
        id="update-media"
        title="Update Media"
        method="PUT"
        path="/stores/:storeId/media/:mediaId"
        description="Updates the details of an existing photo or video in a store's media gallery. Only the store owner can perform this action."
        requestBody={`{
  "title": "Updated salon exterior",
  "description": "New outdoor seating area added.",
  "url": "https://example.com/media/salon-exterior-new.jpg",
  "type": "image"
}

`}
        successResponse={`{
  "status": 0,
  "message": "Media updated successfully.",
  "data": {
    "mediaItem": {
      "_id": "67a90f2c123abc456def7890",
      "title": "Updated salon exterior",
      "description": "New outdoor seating area added.",
      "url": "https://example.com/media/salon-exterior-new.jpg",
      "type": "image",
      "createdAt": "2025-10-27T10:00:00.000Z"
    }
  }
}`}
        errorResponses={[
          `{
      "status": 1,
      "message": "store.notFound"
    }`,
          `{
      "status": 1,
      "message": "store.unauthorizedToUpdateMedia"
    }`,
          `{
      "status": 1,
      "message": "store.mediaItemNotFound"
    }`,
          `{
      "status": 1,
      "message": "store.invalidMediaType"
    }`,
        ]}
        validations={[
          'Requires Bearer token authentication.',
          'Only the store owner can update media.',
          'Partial updates allowed — only fields provided in the request will be modified.',
          "Media type, if updated, must be either 'image' or 'video'.",
          "Operation is performed using subdocument ID lookup inside 'storeMedia'.",
        ]}
        details={['This action invalidates the Redis caches for the store and its media.']}
      />

      {/* Fetch all store's media */}
      <APIDocSection
        id="get-all-media"
        title="Get All Media"
        method="GET"
        path="/stores/:storeId/media"
        description="Fetches all photos and videos for a given store, with support for pagination."
        details={['This endpoint is cached in Redis for 180 seconds.']}
        requestBody={`// Query Parameters
  "page": 1,      // optional, default: 1
  "limit": 10     // optional, default: 10
}`}
        successResponse={`{
  "status": 0,
  "message": "Media fetched successfully.",
  "data": {
    "media": [
      {
        "_id": "67a91bde4f12c345d6789abc",
        "title": "Salon Interior",
        "description": "Main waiting area",
        "url": "https://example.com/media/interior.jpg",
        "type": "image",
        "createdAt": "2025-10-26T15:20:00.000Z"
      },
      {
        "_id": "67a91bde4f12c345d6789abd",
        "title": "Customer Service Video",
        "description": "Overview of our process",
        "url": "https://example.com/media/service.mp4",
        "type": "video",
        "createdAt": "2025-10-26T15:21:00.000Z"
      }
    ],
    "page": 1,
    "limit": 10,
    "total": 2,
    "hasMore": false
  }
}`}
        errorResponses={[
          `{
      "status": 1,
      "message": "store.notFound"
    }`,
        ]}
        validations={[
          'Supports pagination using `page` and `limit` query parameters.',
          'Returns both media data and pagination metadata (total, hasMore).',
          'Store must exist, otherwise returns 404.',
          'Does not require ownership — public endpoint for viewing store media.',
          'Optimized for performance using `.lean()` query and array slicing.',
        ]}
      />

      {/* Get a single store's media */}
      <APIDocSection
        id="get-media-by-id"
        title="Get Media by ID"
        method="GET"
        path="/stores/:storeId/media/:mediaId"
        description="Fetches details of a specific photo or video from a store by its media ID."
        details={['This endpoint is cached in Redis for 180 seconds.']}
        requestBody={`// No body required. Pass authentication token in headers.`}
        successResponse={`{
  "status": 0,
  "message": "Media fetched successfully.",
  "data": {
    "mediaItem": {
      "_id": "67a91bde4f12c345d6789abc",
      "title": "Salon Interior",
      "description": "Main waiting area",
      "url": "https://example.com/media/interior.jpg",
      "type": "image",
      "createdAt": "2025-10-26T15:20:00.000Z"
    }
  }
}`}
        errorResponses={[
          `{
      "status": 1,
      "message": "store.notFound"
    }`,
          `{
      "status": 1,
      "message": "store.unauthorizedToViewMedia"
    }`,
          `{
      "status": 1,
      "message": "store.mediaItemNotFound"
    }`,
        ]}
        validations={[
          'Requires Bearer token authentication, and the user must own the store.',
          'Returns detailed media information including title, description, URL, and type.',
          'If store or media not found, responds with appropriate 404 error.',
          'Access control ensures only authorized owners can fetch their media items.',
        ]}
      />

      {/* Remove a store media */}
      <APIDocSection
        id="delete-media"
        title="Delete Media"
        method="DELETE"
        path="/stores/:storeId/media/:mediaId"
        description="Deletes a specific photo or video from a store. Only the store owner can perform this action."
        requestBody={`// No body required. Pass authentication token in headers.`}
        successResponse={`{
  "status": 0,
  "message": "Media removed successfully.",
  "data": {
    "removedMedia": {
      "_id": "67a91bde4f12c345d6789abc",
      "title": "Salon Exterior",
      "url": "https://firebasestorage.googleapis.com/v0/b/your-app/o/media%2Fsalon.jpg",
      "type": "image",
      "createdAt": "2025-10-26T15:20:00.000Z"
    }
  }
}`}
        errorResponses={[
          `{
      "status": 1,
      "message": "store.notFound"
    }`,
          `{
      "status": 1,
      "message": "store.unauthorizedToRemoveMedia"
    }`,
          `{
      "status": 1,
      "message": "store.mediaItemNotFound"
    }`,
        ]}
        validations={[
          'Only the store owner can delete media items.',
          "If the media item or store doesn't exist, returns a 404 error.",
        ]}
        details={[
          'This action also attempts to delete the corresponding file from Firebase Storage.',
          'Invalidates the Redis caches for the store and its media.',
        ]}
      />

      {/* Get all store's reviews */}
      <APIDocSection
        id="get-store-reviews"
        title="Fetch store reviews"
        method="GET"
        path="/reviews/by-store/:storeId"
        description="Fetches all reviews for a specific store, sorted by creation date (newest first)."
        requestBody={`// No body required. Pass authentication token in headers.`}
        successResponse={`{
  "status": 0,
  "message": "Store reviews fetched successfully",
  "data": {
    "reviews": [
      {
        "_id": "67a924de1f12c345d6789bcd",
        "userId": "uid123",
        "userName": "Jane Doe",
        "rating": 4.5,
        "comment": "Excellent service and friendly staff!",
        "createdAt": "2025-10-26T14:15:00.000Z"
      },
      {
        "_id": "67a924de1f12c345d6789bcf",
        "userId": "uid456",
        "userName": "John Smith",
        "rating": 5,
        "comment": "Loved the ambience and quality!",
        "createdAt": "2025-10-26T13:10:00.000Z"
      }
    ]
  }
}`}
        errorResponses={[
          `{
      "status": 1,
      "message": "Missing storeId"
    }`,
          `{
      "status": 1,
      "message": "Store not found"
    }`,
        ]}
        validations={[
          'Requires a valid storeId parameter.',
          'Returns reviews sorted by creation date (descending).',
          'Always returns an array — can be empty if no reviews exist.',
          'Reviews include rating, comment, and user details if available.',
        ]}
      />

      {/* Remove a store */}
      <APIDocSection
        id="delete-store"
        title="Delete Store"
        method="DELETE"
        path="/stores/:storeId"
        description="Permanently deletes a store from the platform. Only the store owner can perform this action."
        requestBody={`// No body required. Pass authentication token in headers.`}
        successResponse={`{
  "status": 0,
  "message": "Store deleted successfully."
}`}
        errorResponses={[
          `{
      "status": 1,
      "message": "store.notFound"
    }`,
          `{
      "status": 1,
      "message": "store.unauthorizedToDelete"
    }`,
        ]}
        validations={['Only the store owner can delete their store.']}
        details={[
          'This is a permanent action and cannot be undone.',
          'Invalidates multiple Redis caches upon successful deletion.',
        ]}
      />
    </APIDocLayout>
  );
}
