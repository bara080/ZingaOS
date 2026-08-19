'use client';

import { APIDocLayout } from '@/components/docs/APIDocLayout';
import { APIDocSection } from '@/components/docs/APIDocSection';

export default function CustomerDocsPage() {
  const sections = [
    { id: 'get-pending-actions', title: 'Get Pending Actions' },
    { id: 'dismiss-review', title: 'Dismiss Review' },
    { id: 'dismiss-tip', title: 'Dismiss Tip' },
  ];

  return (
    <APIDocLayout
      title="Customer API"
      description="Endpoints specific to the customer experience, such as managing pending reviews and tips for completed bookings."
      sections={sections}
    >
      {/* Get Pending Actions */}
      <APIDocSection
        id="get-pending-actions"
        title="Get Pending Actions"
        method="GET"
        path="/bookings/pending-actions"
        description="Retrieves all pending actions for the currently authenticated customer, specifically focusing on completed bookings that are awaiting a review or a tip."
        details={[
          'This endpoint is cached in Redis for 180 seconds to improve performance.',
          'It queries for service requests where the status is `completed`.',
          'A booking appears in `pendingReviews` if `hasReview` and `reviewDismissed` are both false.',
          'A booking appears in `pendingTips` if it has been paid, the tip amount is zero, and `tipDismissed` is false.',
        ]}
        requestBody={`// No body required. Pass authentication token in headers.
Headers: {
  "Authorization": "Bearer <accessToken>"
}`}
        successResponse={`{
  "status": 0,
  "message": "booking.pendingActionsFetchedSuccess",
  "data": {
    "pendingReviews": [
      {
        "requestId": "booking_123",
        "status": "completed",
        "hasReview": false,
        "reviewDismissed": false
      }
    ],
    "pendingTips": [
       {
        "requestId": "booking_456",
        "status": "completed",
        "payment": { "isPaid": true, "amountBreakdown": { "tipAmount": 0 } },
        "tipDismissed": false
      }
    ]
  }
}`}
        errorResponses={[`{ "status": 0, "message": "booking.noCompletedBookingsFound" }`]}
        validations={['Requires Bearer token authentication with a `customer` role.']}
        workflowSteps={[
          'Fetches all service requests for the user with `status: "completed"`.',
          'Filters the list to create two separate arrays: one for pending reviews and one for pending tips based on their respective flags.',
          'Returns the two arrays, which can be empty if no actions are pending.',
        ]}
      />

      {/* Dismiss Review */}
      <APIDocSection
        id="dismiss-review"
        title="Dismiss Review"
        method="POST"
        path="/bookings/dismiss-review"
        description="Allows a customer to dismiss the prompt to leave a review for a specific completed booking."
        details={[
          'This action is permanent and cannot be undone through the API.',
          'It sets the `reviewDismissed` flag to `true` on the Service Request document.',
          'Automatically invalidates the `pending-actions` cache for the user, ensuring subsequent calls to fetch pending actions reflect the change immediately.',
        ]}
        bodyParams={[
          {
            name: 'requestId',
            type: 'string',
            required: true,
            description: 'The unique identifier of the booking (Service Request) to dismiss.',
          },
        ]}
        requestBody={`{
  "requestId": "booking_123"
}`}
        successResponse={`{
  "status": 0,
  "message": "booking.reviewDismissedSuccess",
  "data": {
    "requestId": "booking_123"
  }
}`}
        errorResponses={[`{ "status": 1, "message": "booking.notFound" }`]}
        validations={[
          'Requires Bearer token authentication with a `customer` role.',
          'The `requestId` must correspond to an existing booking.',
        ]}
      />

      {/* Dismiss Tip */}
      <APIDocSection
        id="dismiss-tip"
        title="Dismiss Tip"
        method="POST"
        path="/bookings/dismiss-tip"
        description="Allows a customer to dismiss the prompt to add a tip for a specific completed and paid booking."
        details={[
          'This action is permanent and cannot be undone through the API.',
          'It sets the `tipDismissed` flag to `true` on the Service Request document.',
          'Automatically invalidates the `pending-actions` cache for the user.',
        ]}
        bodyParams={[
          {
            name: 'requestId',
            type: 'string',
            required: true,
            description: 'The unique identifier of the booking (Service Request) to dismiss.',
          },
        ]}
        requestBody={`{
  "requestId": "booking_456"
}`}
        successResponse={`{
  "status": 0,
  "message": "booking.tipDismissedSuccess",
  "data": {
    "requestId": "booking_456"
  }
}`}
        errorResponses={[`{ "status": 1, "message": "booking.notFound" }`]}
        validations={[
          'Requires Bearer token authentication with a `customer` role.',
          'The `requestId` must correspond to a booking owned by the user with a `completed` status.',
        ]}
      />
    </APIDocLayout>
  );
}
