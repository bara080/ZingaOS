'use client';

import { APIDocLayout } from '@/components/docs/APIDocLayout';
import { APIDocSection } from '@/components/docs/APIDocSection';

export default function ServicesDocsPage() {
  const sections = [
    { id: 'add-service', title: 'Add Service' },
    { id: 'get-all-services', title: 'Get All Services (Global)' },
    { id: 'get-store-services', title: 'Get Store Services' },
    { id: 'get-store-service-by-id', title: 'Get Service by ID' },
    { id: 'update-store-service', title: 'Update Service' },
    { id: 'delete-store-service', title: 'Delete Service' },
  ];

  return (
    <APIDocLayout
      title="Service Management API"
      description="This page documents all endpoints related to services within a store.
These APIs allow service providers to manage the services they offer — including creating, updating, retrieving, and deleting service records.
Each service belongs to a specific store and includes details such as category, pricing, duration, and optional in-home service options."
      sections={sections}
    >
      {/* Add a service to the store */}
      <APIDocSection
        id="add-service"
        title="Add Service"
        method="POST"
        path="/storeServices/:storeId/services"
        description="Adds a new service to a store. The authenticated store owner can create a service entry with pricing, structured duration, and optional in-home service configurations."
        details={[
          'Duration can be passed as a human-readable string (e.g., "45 Minutes", "2 Hours") which the server automatically parses into a structured `{ number, unit, totalMinutes }` object.',
          'If the user owns the store but their Firebase `linkedAccounts.stores` graph has drifted, this endpoint automatically repairs the linkage before adding the service.',
          'Automatically fixes existing malformed duration records on the store before saving.',
          'Invalidates the user and store services Redis caches upon success.',
        ]}
        bodyParams={[
          {
            name: 'serviceCategory',
            type: 'string',
            required: true,
            description: 'The overarching category of the service.',
          },
          {
            name: 'serviceTitle',
            type: 'string',
            required: true,
            description: 'The display name of the service.',
          },
          {
            name: 'inStorePrice',
            type: 'number',
            required: true,
            description: 'The cost for the service performed at the store.',
          },
          {
            name: 'duration',
            type: 'string | object',
            required: true,
            description: 'Duration string (e.g., "1 Hour") or duration object.',
          },
          {
            name: 'inHomeServiceOffered',
            type: 'boolean',
            required: true,
            description: 'Flag indicating if the provider travels to the customer.',
          },
          {
            name: 'inHomePrice',
            type: 'number',
            required: false,
            description: 'Required if `inHomeServiceOffered` is true.',
          },
          {
            name: 'servicePhoto',
            type: 'string',
            required: false,
            description: 'URL to an image representing the service.',
          },
          {
            name: 'serviceDescription',
            type: 'string',
            required: false,
            description: 'Detailed description of the service.',
          },
          {
            name: 'isCustomCategory',
            type: 'boolean',
            required: false,
            description: 'Flag indicating if the category is custom defined.',
          },
        ]}
        requestBody={`{
  "serviceCategory": "Beauty Salon Services",
  "servicePhoto": "https://cdn.example.com/photos/service1.jpg",
  "serviceTitle": "Hair Styling",
  "serviceDescription": "Professional hair styling service for all occasions.",
  "inStorePrice": 1200,
  "duration": "45 Minutes",
  "inHomeServiceOffered": true,
  "inHomePrice": 1500
}`}
        successResponse={`{
  "status": 0,
  "message": "storeServices.serviceAddedSuccess",
  "data": {
    "service": {
      "_id": "67a925de9d1f234d6789ab12",
      "serviceCategory": "Beauty Salon Services",
      "serviceTitle": "Hair Styling",
      "inStorePrice": 1200,
      "duration": {
        "number": "45",
        "unit": "Minutes",
        "totalMinutes": 45
      },
      "inHomeServiceOffered": true,
      "inHomePrice": 1500,
      "createdAt": "2025-10-27T09:30:00.000Z"
    }
  }
}`}
        errorResponses={[
          `{
      "status": 1,
      "message": "storeServices.missingRequiredFields"
    }`,
          `{
      "status": 1,
      "message": "storeServices.invalidDurationString"
    }`,
          `{
      "status": 1,
      "message": "storeServices.inHomePriceRequired"
    }`,
          `{
      "status": 1,
      "message": "storeServices.youDoNotOwnStore"
    }`,
        ]}
        validations={[
          'Requires authentication as a store owner.',
          'Must include all mandatory fields: serviceCategory, serviceTitle, inStorePrice, duration, inHomeServiceOffered.',
          'If inHomeServiceOffered is true, inHomePrice must also be provided.',
          'Prices must be numeric values.',
        ]}
        workflowSteps={[
          'Validates required fields, price types, and parses the string duration into standard total minutes.',
          'Fetches the Store and Firebase User concurrently to verify ownership.',
          'Checks and repairs the `linkedAccounts.stores` graph if it became desynchronized.',
          'Cleans up any existing malformed services in the store document.',
          'Appends the newly structured service object to the store and saves.',
          'Bumps Redis versions and returns the newly added subdocument.',
        ]}
      />

      {/* Fetch all services */}
      <APIDocSection
        id="get-all-services"
        title="Get All Services (Global)"
        method="GET"
        path="/storeServices/services/all"
        description="Fetch all services available across all stores. This endpoint is useful for displaying global service listings, search results, or service discovery pages."
        details={[
          'Uses MongoDB aggregation (`$unwind` and `$replaceRoot`) to extract embedded services from all stores.',
          'Cached heavily in Redis for 45 seconds to accommodate high read volume.',
        ]}
        requestBody={`// No body required. Pass authentication token in headers.`}
        successResponse={`{
  "status": 0,
  "message": "storeServices.allServicesFetchedSuccess",
  "data": {
    "services": [
      {
        "_id": "6712bf19e9a5b47a1a23456a",
        "serviceCategory": "Massage Services",
        "servicePhoto": "https://cdn.example.com/service/deep-tissue.jpg",
        "serviceTitle": "Deep Tissue Massage",
        "serviceDescription": "60-minute deep tissue massage for relaxation.",
        "inStorePrice": 1500,
        "inHomeServiceOffered": true,
        "inHomePrice": 2000,
        "duration": {
          "number": "60",
          "unit": "Minutes",
          "totalMinutes": 60
        },
        "ratings": 4.8,
        "createdAt": "2025-09-12T10:00:00.000Z"
      }
    ]
  }
}`}
        validations={[
          'Requires a valid authenticated user token.',
          'Empty array if no stores or services are found.',
        ]}
      />

      {/* Get a store's services */}
      <APIDocSection
        id="get-store-services"
        title="Get Store Services"
        method="GET"
        path="/storeServices/:storeId/services"
        description="Fetches all services associated with a specific store. Returns a list of all services created by the store owner, sorted by creation date."
        details={[
          'Cached in Redis for 120 seconds.',
          'Optimized using Mongoose `.lean()` to only pull the specific `services` field.',
          'Services are sorted descending by their `createdAt` date (newest first).',
        ]}
        requestBody={`// No body required. Pass authentication token in headers.`}
        successResponse={`{
  "status": 0,
  "message": "storeServices.servicesFetchedSuccess",
  "data": {
    "services": [
      {
        "_id": "67a928b79e2a7bcd1234ef56",
        "serviceCategory": "Massage Services",
        "servicePhoto": "https://cdn.example.com/photos/massage.jpg",
        "serviceTitle": "Full Body Massage",
        "serviceDescription": "Relaxing and rejuvenating full body massage.",
        "inStorePrice": 1800,
        "inHomeServiceOffered": true,
        "inHomePrice": 2200,
        "duration": {
          "number": "60",
          "unit": "Minutes",
          "totalMinutes": 60
        },
        "ratings": 4.8,
        "createdAt": "2025-10-27T10:00:00.000Z"
      }
    ]
  }
}`}
        errorResponses={[
          `{
      "status": 1,
      "message": "store.notFound"
    }`,
        ]}
        validations={[
          'StoreId must be a valid and existing store identifier.',
          'Returns an empty array if no services are found.',
        ]}
      />

      {/* Fetch a service details */}
      <APIDocSection
        id="get-store-service-by-id"
        title="Get Service by ID"
        method="GET"
        path="/storeServices/:storeId/services/:serviceId"
        description="Fetch a specific service from a store by its unique service ID. Returns the full details of the selected service including pricing, duration, and category."
        details={['Cached in Redis for 120 seconds.']}
        requestBody={`// No body required. Pass authentication token in headers.`}
        successResponse={`{
  "status": 0,
  "message": "storeServices.serviceFetchedSuccess",
  "data": {
    "service": {
      "_id": "67a92a14d9c7bcd1234ef89",
      "serviceCategory": "Photography Services",
      "servicePhoto": "https://cdn.example.com/service/wedding-photo.jpg",
      "serviceTitle": "Wedding Photography",
      "serviceDescription": "Full-day wedding photography package with editing.",
      "inStorePrice": 12000,
      "inHomeServiceOffered": false,
      "duration": {
        "number": "8",
        "unit": "Hours",
        "totalMinutes": 480
      },
      "ratings": 4.9,
      "createdAt": "2025-10-27T10:15:00.000Z"
    }
  }
}`}
        errorResponses={[
          `{
      "status": 1,
      "message": "Store not found."
    }`,
          `{
      "status": 1,
      "message": "Service not found."
    }`,
        ]}
        validations={[
          'Requires authentication (service provider or authorized user).',
          'StoreId and ServiceId must both exist.',
          'Returns full service details if found.',
        ]}
      />

      {/* Update a service details */}
      <APIDocSection
        id="update-store-service"
        title="Update service"
        method="PUT"
        path="/storeServices/:storeId/services/:serviceId"
        description="Update details of an existing service in a specific store. Only the store owner is authorized to perform this operation."
        requestBody={`{
  "servicePhoto": "https://cdn.example.com/service/deep-tissue.jpg",
  "serviceTitle": "Deep Tissue Massage (60 mins)",
  "serviceDescription": "Relaxing full-body deep tissue therapy session.",
  "inStorePrice": 1800,
  "inHomeServiceOffered": true,
  "inHomePrice": 2200,
  "duration": {
    "number": "60",
    "unit": "Minutes",
    "totalMinutes": 60
  },
  "serviceCategory": "Massage Services"
}`}
        successResponse={`{
  "status": 0,
  "message": "storeServices.serviceUpdatedSuccess",
  "data": {
    "service": {
      "_id": "6712bf19e9a5b47a1a23456a",
      "servicePhoto": "https://cdn.example.com/service/deep-tissue.jpg",
      "serviceTitle": "Deep Tissue Massage (60 mins)",
      "serviceDescription": "Relaxing full-body deep tissue therapy session.",
      "inStorePrice": 1800,
      "inHomeServiceOffered": true,
      "inHomePrice": 2200,
      "duration": {
        "number": "60",
        "unit": "Minutes",
        "totalMinutes": 60
      },
      "serviceCategory": "Massage Services",
      "updatedAt": "2025-10-27T08:30:00.000Z"
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
      "message": "service.notFound"
    }`,
        ]}
        validations={[
          'Requires Authorization header with a valid Bearer token.',
          'Unrecognized fields in the request body are ignored.',
        ]}
      />

      {/* Remove a service */}
      <APIDocSection
        id="delete-store-service"
        title="Delete Service"
        method="DELETE"
        path="/storeServices/:storeId/services/:serviceId"
        description="Remove an existing service from a store. This action is permanent and can only be performed by the store owner."
        details={[
          'Bumps the Redis version for the store to immediately invalidate cached service lists.',
        ]}
        requestBody={`// No body required. Pass authentication token in headers.`}
        successResponse={`{
  "status": 0,
  "message": "storeServices.serviceDeletedSuccess"
}`}
        errorResponses={[
          `{
      "status": 1,
      "message": "store.notFound"
    }`,
          `{
      "status": 1,
      "message": "service.notFound"
    }`,
        ]}
        validations={[
          'Only the store owner can delete a service.',
          'Once deleted, the service cannot be recovered.',
        ]}
      />
    </APIDocLayout>
  );
}
