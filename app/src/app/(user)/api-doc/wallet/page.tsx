'use client';

import { APIDocLayout } from '@/components/docs/APIDocLayout';
import { APIDocSection } from '@/components/docs/APIDocSection';

export default function WalletDocsPage() {
  const sections = [
    { id: 'create-stripe-connect-account', title: 'Create Stripe Connect Account' },
    { id: 'get-stripe-onboarding-status', title: 'Get Onboarding Status' },
    { id: 'get-stripe-connect-account-details', title: 'Get Connect Account Details' },
    { id: 'get-balance', title: 'Get Wallet Balance' },
    { id: 'get-transactions', title: 'Get Transactions' },
    { id: 'withdraw-funds', title: 'Withdraw Funds' },
  ];

  return (
    <APIDocLayout
      title="Wallet & Transactions API"
      description="Endpoints for managing Stripe Connect accounts and the internal ledger system. This API handles Stripe onboarding, retrieving wallet balances, fetching transaction histories, and executing payouts."
      sections={sections}
    >
      {/* Create Stripe Connect Account */}
      <APIDocSection
        id="create-stripe-connect-account"
        title="Create Stripe Connect Account"
        method="POST"
        path="/stripe/connect/:storeId"
        description="Creates or updates a Stripe Express account for a service provider's store and generates a unique onboarding link."
        details={[
          'If a Stripe account does not exist for the store, a new one is created with pre-filled KYC data.',
          'If an account already exists, it updates the KYC information on Stripe.',
          'The `onboardingUrl` returned is a single-use link that directs the provider to the Stripe-hosted onboarding flow.',
          'The backend sanitizes all KYC data (e.g., normalizing phone numbers to E.164) before sending it to Stripe to prevent errors.',
        ]}
        bodyParams={[
          { name: 'email', type: 'string', required: true, description: "Provider's email." },
          {
            name: 'firstName',
            type: 'string',
            required: true,
            description: "Provider's legal first name.",
          },
          {
            name: 'lastName',
            type: 'string',
            required: true,
            description: "Provider's legal last name.",
          },
          {
            name: 'phone',
            type: 'string',
            required: false,
            description: "Provider's phone number.",
          },
          {
            name: 'dob',
            type: 'object',
            required: false,
            description: 'Date of birth: `{ day, month, year }`.',
          },
          { name: 'address', type: 'object', required: false, description: 'Address object.' },
          {
            name: 'ssn_last_4',
            type: 'string',
            required: false,
            description: 'Last 4 digits of SSN.',
          },
        ]}
        requestBody={`{
  "email": "provider@example.com",
  "firstName": "Jane",
  "lastName": "Doe"
}`}
        successResponse={`{
  "status": 0,
  "message": "stripe.connectReady",
  "data": {
    "accountId": "acct_1P...",
    "onboardingUrl": "https://connect.stripe.com/setup/s/..."
  }
}`}
        errorResponses={[
          `{ "status": 1, "message": "store.notFound" }`,
          `{ "status": 1, "message": "stripe.notAuthorized" }`,
        ]}
        validations={[
          'Requires Bearer token authentication.',
          'The user must be the owner of the `storeId` provided in the URL.',
        ]}
      />

      {/* Get Stripe Onboarding Status */}
      <APIDocSection
        id="get-stripe-onboarding-status"
        title="Get Onboarding Status"
        method="GET"
        path="/stripe/onboarding-status/:storeId"
        description="Retrieves the Stripe onboarding status for a specific store, including whether payouts are enabled and what requirements are still pending."
        requestBody={`// No body required. Pass authentication token in headers.`}
        successResponse={`{
  "status": 0,
  "message": "stripe.accountStatus",
  "data": {
    "account": {
      "id": "acct_1P...",
      "payouts_enabled": true,
      "charges_enabled": true
    },
    "onboardingComplete": true,
    "requirements": { "currently_due": [], "past_due": [] }
  }
}`}
        errorResponses={[`{ "status": 1, "message": "stripe.noStripeAccountYet" }`]}
        validations={['Requires Bearer token authentication.', 'The user must own the store.']}
      />

      {/* Get Connect Account Details */}
      <APIDocSection
        id="get-stripe-connect-account-details"
        title="Get Connect Account Details"
        method="GET"
        path="/stripe/account/:accountId"
        description="Retrieves public details for a Stripe Connect account directly by its ID."
        requestBody={`// No body required. Pass authentication token in headers.`}
        successResponse={`{
  "status": 0,
  "message": "stripe.accountDetails",
  "data": {
    "id": "acct_1P...",
    "email": "provider@example.com",
    "payouts_enabled": true,
    "charges_enabled": true,
    "requirements": { /* ... */ }
  }
}`}
      />

      <APIDocSection
        id="get-balance"
        title="Get Wallet Balance"
        method="GET"
        path="/wallet/balance"
        description="Retrieves the current wallet balances for the authenticated user. Automatically scopes the request to the active store if the user is a Service Provider."
        details={[
          'Balances are separated into `balance` (available), `pendingBalance` (uncleared or held funds), and `lockedBalance` (funds held due to active disputes).',
          'Resolves the `ownerId` automatically using `req.user.activeAccount.id` for providers or `req.user.uid` for customers.',
        ]}
        requestBody={`// No body required. Pass authentication token in headers.
GET /wallet/balance`}
        successResponse={`{
  "status": 0,
  "message": "wallet.balanceFetchedSuccess",
  "data": {
    "balance": {
      "ownerType": "service-provider",
      "ownerId": "store_12345",
      "balance": 1450,
      "pendingBalance": 230,
      "lockedBalance": 0,
      "currency": "usd"
    }
  }
}`}
        errorResponses={[
          `{
  "status": 1,
  "message": "wallet.missingOwnerId"
}`,
        ]}
        validations={['Requires Bearer token authentication.']}
      />

      {/* Get Transactions */}
      <APIDocSection
        id="get-transactions"
        title="Get Transactions"
        method="GET"
        path="/wallet/transactions"
        description="Fetches a paginated list of ledger transactions associated with the user's wallet. Supports filtering by transaction entry type and balance type."
        requestBody={`// Query Parameters
GET /wallet/transactions?page=1&limit=10&entryType=credit&balanceType=available`}
        successResponse={`{
  "status": 0,
  "message": "wallet.transactionsFetchedSuccess",
  "data": {
    "transactions": [
      {
        "_id": "67a92b3f1c2d3e4f5a6b7c8d",
        "ownerType": "service-provider",
        "ownerId": "store_12345",
        "entryType": "credit",
        "balanceType": "available",
        "amount": 120,
        "currency": "usd",
        "referenceId": "pi_3QzFhCk4gX5ad72",
        "description": "Payment for booking REQ_00123",
        "createdAt": "2025-10-27T08:30:00.000Z"
      }
    ],
    "total": 45,
    "page": 1,
    "limit": 10
  }
}`}
        errorResponses={[
          `// Returns an empty array rather than an error if no transactions are found
{
  "status": 0,
  "message": "wallet.noTransactionsFound",
  "data": {
    "transactions": [],
    "total": 0,
    "page": 1,
    "limit": 10
  }
}`,
        ]}
        validations={[
          'Requires Bearer token authentication.',
          '`page` and `limit` are optional numeric queries (default to 1 and 10).',
          '`entryType` is optional: `credit` or `debit`.',
          '`balanceType` is optional: `available`, `pending`, or `locked`.',
        ]}
      />

      {/* Withdraw Funds */}
      <APIDocSection
        id="withdraw-funds"
        title="Withdraw Funds"
        method="POST"
        path="/wallet/withdraw"
        description="Initiates a payout from the Service Provider's available wallet balance to their connected Stripe account."
        details={[
          'Currently restricted exclusively to Service Providers.',
          'The Service Provider must have an active store selected in their session and a fully onboarded Stripe Connect account.',
          'The backend verifies sufficient available balance and initiates a Stripe Payout or Transfer via `withdrawWalletBalance` helper.',
        ]}
        bodyParams={[
          {
            name: 'amount',
            type: 'number',
            required: true,
            description:
              'The amount to withdraw in human-readable units (e.g., 50.00). Must be greater than 0.',
          },
        ]}
        requestBody={`{
  "amount": 150
}`}
        successResponse={`{
  "status": 0,
  "message": "wallet.withdrawalSuccess",
  "data": {
    "transactionId": "po_1Qx...9Zj",
    "amount": 150,
    "status": "pending",
    "currency": "usd"
  }
}`}
        errorResponses={[
          `{
  "status": 1,
  "message": "wallet.onlyProvidersCanWithdraw"
}`,
          `{
  "status": 1,
  "message": "wallet.invalidWithdrawalAmount"
}`,
          `{
  "status": 1,
  "message": "wallet.noActiveStoreSelected"
}`,
          `{
  "status": 1,
  "message": "wallet.stripeAccountNotConnected"
}`,
        ]}
        validations={[
          '`amount` must be a finite number greater than 0.',
          'Requires the user role to be `service-provider`.',
        ]}
        workflowSteps={[
          "Validates the requested amount and the user's role.",
          'Ensures the user has an active store with a linked `stripeAccountId`.',
          'Calls `withdrawWalletBalance` to execute the transaction safely, deduct the balance from the internal ledger, and trigger the Stripe payout API.',
        ]}
      />
    </APIDocLayout>
  );
}
