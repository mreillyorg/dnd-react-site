# Requirements Document

## Introduction

This document specifies the requirements for the Subscription Model in a web-based Dungeons & Dragons companion site. The system enables users to subscribe to tiered service plans (Free, Adventurer, Hero, Legend), manages payment processing through Stripe, enforces feature access limits based on subscription tier, and handles subscription lifecycle events including trials, upgrades, downgrades, cancellations, and renewals. The subscription model is foundational for monetizing the platform while providing a fair free tier and clear value progression for paying users.

## Glossary

- **Subscription_System**: The component responsible for managing user subscriptions, payment processing, and feature access control
- **Payment_Processor**: The Stripe integration responsible for processing payments and managing customer billing
- **Subscription_Tier**: A named service level with associated features and limits: Free, Adventurer, Hero, or Legend
- **Free_Tier**: The no-cost subscription tier with limited features, available indefinitely
- **Adventurer_Tier**: The entry-level paid subscription tier at $4.99/month with expanded limits
- **Hero_Tier**: The mid-level paid subscription tier at $9.99/month with higher limits and additional features
- **Legend_Tier**: The premium paid subscription tier at $19.99/month with unlimited access and exclusive features
- **Feature_Gate**: A permission check that restricts access to a feature or enforces a limit based on the user's Subscription_Tier
- **Subscription_Status**: The current state of a user's subscription: trial, active, past_due, canceled, or expired
- **Billing_Cycle**: The recurring time period for subscription charges: monthly or annual
- **Trial_Period**: A 14-day free trial of a paid Subscription_Tier available to new users
- **Stripe_Customer**: A Stripe customer record linked to a user account
- **Stripe_Subscription**: A Stripe subscription record managing the billing lifecycle
- **Payment_Method**: A stored payment method (credit card, debit card, or digital wallet) in Stripe
- **Invoice**: A Stripe invoice representing a billing charge
- **Webhook**: A Stripe webhook event notifying the Subscription_System of billing events
- **Proration**: The calculation of partial billing when upgrading or downgrading mid-cycle
- **Grace_Period**: A 7-day period after a failed payment during which the subscription remains active
- **Cancellation_Effective_Date**: The date when a canceled subscription will expire (end of current billing period)
- **Usage_Limit**: A numeric restriction on feature usage enforced by the Subscription_System based on Subscription_Tier
- **Campaign_Limit**: The maximum number of active campaigns a user can create, determined by Subscription_Tier
- **Character_Limit**: The maximum number of characters a user can create, determined by Subscription_Tier
- **Storage_Limit**: The maximum storage space in MB for user assets (maps, tokens, images), determined by Subscription_Tier
- **Session_History_Retention**: The number of days session history is retained, determined by Subscription_Tier
- **Upgrade**: A change from a lower Subscription_Tier to a higher Subscription_Tier
- **Downgrade**: A change from a higher Subscription_Tier to a lower Subscription_Tier
- **Billing_Portal**: A Stripe-hosted interface for managing payment methods, viewing invoices, and updating subscription details
- **Admin_Override**: An administrative action to manually adjust a user's Subscription_Tier or features outside normal billing flow

## Requirements

### Requirement 1: Subscription Tier Definition

**User Story:** As a product owner, I want to define clear subscription tiers with specific features and limits, so that users understand the value proposition of each tier.

#### Acceptance Criteria

1. THE Subscription_System SHALL support four Subscription_Tier values: Free, Adventurer, Hero, and Legend
2. THE Free_Tier SHALL include the following limits:
   - Campaign_Limit: 1 active campaign
   - Character_Limit: 3 characters
   - Storage_Limit: 50 MB
   - Session_History_Retention: 30 days
   - No access to advanced combat features (stat block storage, condition automation)
   - No access to reference lookup features
3. THE Adventurer_Tier SHALL cost $4.99 per month and include the following limits:
   - Campaign_Limit: 3 active campaigns
   - Character_Limit: 10 characters
   - Storage_Limit: 500 MB
   - Session_History_Retention: 180 days
   - Full access to combat tracker and initiative tracker
   - Access to basic reference lookups (spells, monsters)
4. THE Hero_Tier SHALL cost $9.99 per month and include the following limits:
   - Campaign_Limit: 10 active campaigns
   - Character_Limit: 30 characters
   - Storage_Limit: 2 GB
   - Session_History_Retention: 365 days
   - Full access to combat tracker with stat block storage
   - Full access to reference lookups
   - Access to magic item and consumables tracker
   - Access to session scheduling features
5. THE Legend_Tier SHALL cost $19.99 per month and include the following limits:
   - Campaign_Limit: unlimited
   - Character_Limit: unlimited
   - Storage_Limit: 10 GB
   - Session_History_Retention: unlimited
   - All features from Hero_Tier
   - Access to Adventurer's League DM log exports
   - Priority support
   - Early access to beta features
6. THE Subscription_System SHALL support both monthly and annual Billing_Cycle options
7. WHEN a user selects an annual Billing_Cycle, THE Subscription_System SHALL apply a 20% discount to the monthly price


### Requirement 2: New User Subscription Flow

**User Story:** As a new user, I want to start with a free tier and optionally trial a paid tier, so that I can evaluate the platform before committing to a subscription.

#### Acceptance Criteria

1. WHEN a new user account is created, THE Subscription_System SHALL set the user's Subscription_Tier to Free and Subscription_Status to active
2. THE Subscription_System SHALL allow a new Free_Tier user to start a Trial_Period for any paid Subscription_Tier
3. WHEN a user starts a Trial_Period, THE Subscription_System SHALL set Subscription_Status to trial and grant access to all features of the selected Subscription_Tier
4. THE Trial_Period SHALL last 14 days from the start date
5. WHEN a user starts a Trial_Period, THE Subscription_System SHALL require a valid Payment_Method but SHALL NOT charge the Payment_Method until the Trial_Period ends
6. WHEN a Trial_Period ends and no cancellation has been made, THE Subscription_System SHALL automatically convert the subscription to active and charge the Payment_Method for the first billing period
7. IF a user cancels during the Trial_Period, THEN THE Subscription_System SHALL set Subscription_Status to canceled, revert the user to Free_Tier at the end of the Trial_Period, and SHALL NOT charge the Payment_Method
8. THE Subscription_System SHALL allow only one Trial_Period per user account lifetime
9. IF a user attempts to start a second Trial_Period, THEN THE Subscription_System SHALL reject the request and display an error message indicating that trials are limited to one per account


### Requirement 3: Subscription Purchase and Activation

**User Story:** As a user, I want to subscribe to a paid tier, so that I can access additional features and higher limits.

#### Acceptance Criteria

1. WHILE authenticated, THE Subscription_System SHALL display the subscription tier comparison page showing all Subscription_Tier options with features, limits, and pricing
2. WHEN a Free_Tier user selects a paid Subscription_Tier, THE Subscription_System SHALL redirect the user to the Stripe Checkout page
3. THE Stripe Checkout page SHALL collect Payment_Method details and process the initial payment
4. WHEN payment succeeds, THE Payment_Processor SHALL create a Stripe_Customer and Stripe_Subscription record
5. WHEN the Stripe_Subscription is created, THE Subscription_System SHALL receive a Webhook event and update the user's Subscription_Tier and set Subscription_Status to active
6. WHEN a subscription is activated, THE Subscription_System SHALL send a confirmation email to the user with subscription details and invoice
7. THE Subscription_System SHALL update the user's Subscription_Tier and feature access within 10 seconds of receiving the Webhook event
8. IF payment fails during checkout, THEN THE Subscription_System SHALL display an error message and allow the user to retry with a different Payment_Method
9. THE Subscription_System SHALL store the Stripe_Customer ID and Stripe_Subscription ID on the user account for future billing operations


### Requirement 4: Subscription Upgrades

**User Story:** As a paying subscriber, I want to upgrade to a higher tier, so that I can access more features and higher limits.

#### Acceptance Criteria

1. WHILE a user has an active paid subscription, THE Subscription_System SHALL allow the user to upgrade to a higher Subscription_Tier
2. WHEN a user upgrades mid-billing-cycle, THE Subscription_System SHALL calculate Proration credit for the unused portion of the current tier and apply it to the upgrade charge
3. WHEN an upgrade is initiated, THE Subscription_System SHALL charge the prorated amount immediately using the stored Payment_Method
4. WHEN the upgrade payment succeeds, THE Subscription_System SHALL update the Subscription_Tier immediately and grant access to the new tier's features within 10 seconds
5. WHEN an upgrade occurs, THE Subscription_System SHALL reset the billing cycle start date to the upgrade date
6. WHEN an upgrade is completed, THE Subscription_System SHALL send a confirmation email to the user with the new subscription details and updated invoice
7. IF the upgrade payment fails, THEN THE Subscription_System SHALL keep the user on their current Subscription_Tier and display an error message
8. THE Subscription_System SHALL allow a user to upgrade from Free_Tier to any paid tier
9. THE Subscription_System SHALL allow a user to upgrade from Adventurer_Tier to Hero_Tier or Legend_Tier
10. THE Subscription_System SHALL allow a user to upgrade from Hero_Tier to Legend_Tier


### Requirement 5: Subscription Downgrades

**User Story:** As a paying subscriber, I want to downgrade to a lower tier, so that I can reduce my subscription cost while retaining some paid features.

#### Acceptance Criteria

1. WHILE a user has an active paid subscription, THE Subscription_System SHALL allow the user to downgrade to a lower Subscription_Tier including Free_Tier
2. WHEN a user downgrades, THE Subscription_System SHALL schedule the downgrade to take effect at the end of the current billing period
3. WHEN a downgrade is scheduled, THE Subscription_System SHALL set the Subscription_Status to active and store the pending Subscription_Tier change
4. WHEN the current billing period ends, THE Subscription_System SHALL apply the downgrade, update the Subscription_Tier, and restrict features according to the new tier
5. WHEN a downgrade takes effect, THE Subscription_System SHALL send a confirmation email to the user with the new subscription details
6. WHEN a user downgrades to a tier with lower limits, THE Subscription_System SHALL enforce the new limits immediately after the downgrade takes effect
7. IF a user's current usage exceeds the limits of the target Subscription_Tier, THEN THE Subscription_System SHALL display a warning before confirming the downgrade, listing which content will be affected (e.g., "You have 5 active campaigns but the Free tier allows 1. You will need to archive 4 campaigns.")
8. WHEN a downgrade to Free_Tier takes effect, THE Subscription_System SHALL cancel the Stripe_Subscription
9. THE Subscription_System SHALL allow a user to cancel a pending downgrade before the current billing period ends, keeping the current Subscription_Tier
10. WHEN a downgrade from a paid tier to Free_Tier takes effect, THE Subscription_System SHALL NOT issue a refund for the unused portion of the billing period


### Requirement 6: Subscription Renewal and Recurring Billing

**User Story:** As a paying subscriber, I want my subscription to renew automatically, so that I don't lose access to features due to missed payments.

#### Acceptance Criteria

1. WHEN a subscription billing cycle ends, THE Subscription_System SHALL attempt to charge the stored Payment_Method automatically
2. WHEN a renewal payment succeeds, THE Subscription_System SHALL extend the subscription for another billing period and send a receipt email to the user
3. WHEN a renewal payment succeeds, THE Subscription_System SHALL update the user's next billing date to reflect the new cycle end date
4. IF a renewal payment fails, THEN THE Subscription_System SHALL set Subscription_Status to past_due and send a payment failure email to the user
5. WHEN a subscription enters past_due status, THE Subscription_System SHALL retain full feature access for a Grace_Period of 7 days
6. DURING the Grace_Period, THE Subscription_System SHALL attempt to charge the Payment_Method daily
7. IF payment succeeds during the Grace_Period, THEN THE Subscription_System SHALL set Subscription_Status to active and send a confirmation email
8. IF payment fails for the entire Grace_Period, THEN THE Subscription_System SHALL set Subscription_Status to expired, downgrade the user to Free_Tier, and send a subscription expired email
9. WHEN a subscription expires due to failed payment, THE Subscription_System SHALL retain the user's data but restrict access to features beyond Free_Tier limits
10. THE Subscription_System SHALL allow a user with an expired subscription to reactivate by updating their Payment_Method and paying the outstanding balance


### Requirement 7: Subscription Cancellation

**User Story:** As a paying subscriber, I want to cancel my subscription, so that I am not charged for future billing periods.

#### Acceptance Criteria

1. WHILE a user has an active paid subscription, THE Subscription_System SHALL allow the user to cancel their subscription at any time
2. WHEN a user cancels a subscription, THE Subscription_System SHALL set the Subscription_Status to canceled and calculate the Cancellation_Effective_Date as the end of the current billing period
3. WHEN a subscription is canceled, THE Subscription_System SHALL maintain full feature access until the Cancellation_Effective_Date
4. WHEN a subscription is canceled, THE Subscription_System SHALL send a cancellation confirmation email to the user with the Cancellation_Effective_Date
5. WHEN the Cancellation_Effective_Date is reached, THE Subscription_System SHALL downgrade the user to Free_Tier and restrict features accordingly
6. WHEN a subscription is canceled, THE Subscription_System SHALL cancel the Stripe_Subscription with the at_period_end flag set to true
7. THE Subscription_System SHALL NOT issue refunds for the unused portion of the billing period when a subscription is canceled
8. THE Subscription_System SHALL allow a user to reactivate a canceled subscription before the Cancellation_Effective_Date
9. WHEN a canceled subscription is reactivated, THE Subscription_System SHALL set Subscription_Status to active and remove the Cancellation_Effective_Date
10. WHEN a canceled subscription reaches the Cancellation_Effective_Date, THE Subscription_System SHALL retain all user data but restrict access per Free_Tier limits


### Requirement 8: Payment Method Management

**User Story:** As a paying subscriber, I want to manage my payment methods, so that I can update my billing information without losing my subscription.

#### Acceptance Criteria

1. WHILE a user has an active paid subscription, THE Subscription_System SHALL allow the user to access the Billing_Portal
2. THE Billing_Portal SHALL allow users to add, update, and remove Payment_Method records
3. WHEN a user adds a new Payment_Method, THE Subscription_System SHALL validate the Payment_Method with Stripe before storing it
4. THE Subscription_System SHALL allow a user to set a default Payment_Method for subscription charges
5. WHEN a user updates their default Payment_Method, THE Subscription_System SHALL update the Stripe_Subscription to use the new Payment_Method for future charges
6. THE Billing_Portal SHALL display the last 4 digits and expiration date of stored credit/debit cards
7. THE Billing_Portal SHALL allow users to remove a Payment_Method only if it is not the default Payment_Method for an active subscription
8. IF a user attempts to remove the default Payment_Method for an active subscription, THEN THE Subscription_System SHALL display an error message requiring the user to add a new Payment_Method first
9. THE Subscription_System SHALL send an email notification when a Payment_Method is about to expire (30 days before expiration)
10. THE Subscription_System SHALL support credit cards, debit cards, and digital wallets (Apple Pay, Google Pay) as Payment_Method types


### Requirement 9: Invoice and Billing History

**User Story:** As a paying subscriber, I want to view my billing history and download invoices, so that I can track my subscription expenses and maintain records.

#### Acceptance Criteria

1. WHILE a user has an active or past paid subscription, THE Subscription_System SHALL allow the user to view their billing history
2. THE billing history SHALL display a list of all Invoice records including invoice number, date, amount, Subscription_Tier, and payment status
3. THE Subscription_System SHALL allow users to download each Invoice as a PDF
4. WHEN an Invoice is paid, THE Subscription_System SHALL send the Invoice PDF to the user's email address within 10 minutes
5. THE Billing_Portal SHALL display the next billing date and amount for active subscriptions
6. THE Billing_Portal SHALL display the billing cycle type (monthly or annual) for active subscriptions
7. THE Subscription_System SHALL retain Invoice records indefinitely for all users
8. THE billing history SHALL indicate failed payment attempts with a clear status label
9. THE Subscription_System SHALL allow users to access unpaid Invoice records and retry payment
10. WHEN a user retries payment for an unpaid Invoice, THE Subscription_System SHALL charge the current default Payment_Method and update the Invoice status


### Requirement 10: Feature Access Control and Limits Enforcement

**User Story:** As a system, I need to enforce subscription tier limits on feature usage, so that users can only access features and resources allowed by their current tier.

#### Acceptance Criteria

1. THE Subscription_System SHALL implement Feature_Gate checks for all features with tier-specific access restrictions
2. WHEN a user attempts to create a campaign and has reached their Campaign_Limit, THE Subscription_System SHALL block the action and display an upgrade prompt showing the next tier that allows more campaigns
3. WHEN a user attempts to create a character and has reached their Character_Limit, THE Subscription_System SHALL block the action and display an upgrade prompt
4. WHEN a user attempts to upload an asset and has reached their Storage_Limit, THE Subscription_System SHALL block the upload and display an upgrade prompt with current storage usage and available tiers
5. WHEN a user downgrades to a tier with a lower Campaign_Limit and currently has more active campaigns than the new limit allows, THE Subscription_System SHALL require the user to archive excess campaigns before the downgrade takes effect
6. WHEN a user downgrades to a tier with a lower Character_Limit and currently has more characters than the new limit allows, THE Subscription_System SHALL require the user to delete or archive excess characters before the downgrade takes effect
7. WHEN a user downgrades to a tier with a lower Storage_Limit and currently exceeds the new storage limit, THE Subscription_System SHALL require the user to delete assets to meet the new limit before the downgrade takes effect
8. THE Subscription_System SHALL display the user's current usage and tier limits on the account dashboard (e.g., "Campaigns: 2/3", "Characters: 7/10", "Storage: 340 MB / 500 MB")
9. WHEN a Free_Tier user attempts to access a paid-only feature, THE Subscription_System SHALL display a feature-specific upgrade prompt explaining the benefit and showing which tiers include that feature
10. THE Subscription_System SHALL enforce Session_History_Retention by automatically archiving or deleting session data older than the retention period for the user's Subscription_Tier
11. THE Subscription_System SHALL run a daily background job to enforce Storage_Limit and Session_History_Retention policies


### Requirement 11: Webhook Event Processing

**User Story:** As a system, I need to process Stripe webhook events reliably, so that subscription state stays synchronized with billing events.

#### Acceptance Criteria

1. THE Subscription_System SHALL implement a webhook endpoint to receive Stripe Webhook events
2. THE Subscription_System SHALL verify the webhook signature for all incoming Webhook events to prevent spoofing
3. WHEN a `customer.subscription.created` event is received, THE Subscription_System SHALL create or update the user's subscription record
4. WHEN a `customer.subscription.updated` event is received, THE Subscription_System SHALL update the user's Subscription_Tier, Subscription_Status, and billing cycle dates
5. WHEN a `customer.subscription.deleted` event is received, THE Subscription_System SHALL downgrade the user to Free_Tier
6. WHEN an `invoice.payment_succeeded` event is received, THE Subscription_System SHALL mark the Invoice as paid and send a receipt email
7. WHEN an `invoice.payment_failed` event is received, THE Subscription_System SHALL set Subscription_Status to past_due and send a payment failure email
8. WHEN a `customer.subscription.trial_will_end` event is received (3 days before trial ends), THE Subscription_System SHALL send a trial ending reminder email
9. THE Subscription_System SHALL log all received Webhook events with timestamp, event type, and processing status
10. THE Subscription_System SHALL implement idempotency for webhook processing to handle duplicate events safely
11. THE Subscription_System SHALL respond to Webhook requests with HTTP 200 within 5 seconds to prevent Stripe retries
12. IF webhook processing fails, THEN THE Subscription_System SHALL log the error and allow Stripe's automatic retry mechanism to redeliver the event


### Requirement 12: Admin Subscription Management

**User Story:** As an admin, I want to manually adjust user subscriptions for customer support or promotional purposes, so that I can handle edge cases and provide exceptional service.

#### Acceptance Criteria

1. WHERE a user has Security_Level Admin, THE Subscription_System SHALL provide an admin interface to view and modify any user's subscription
2. THE admin interface SHALL allow an Admin to view a user's current Subscription_Tier, Subscription_Status, billing history, and usage statistics
3. THE admin interface SHALL allow an Admin to apply an Admin_Override to grant a user any Subscription_Tier without payment
4. WHEN an Admin_Override is applied, THE Subscription_System SHALL set a flag indicating the subscription is admin-managed and SHALL NOT process automatic billing
5. THE admin interface SHALL allow an Admin to set an expiration date for an Admin_Override subscription
6. WHEN an Admin_Override subscription expires, THE Subscription_System SHALL downgrade the user to Free_Tier unless they have an active paid subscription
7. THE admin interface SHALL allow an Admin to issue a refund for a subscription payment
8. WHEN an Admin issues a refund, THE Subscription_System SHALL log the refund amount, reason, and admin user ID
9. THE admin interface SHALL allow an Admin to extend a user's current billing period by a specified number of days
10. THE admin interface SHALL allow an Admin to cancel any user's subscription immediately or at period end
11. THE Subscription_System SHALL maintain an audit log of all Admin_Override actions including admin user, target user, action type, timestamp, and reason
12. THE admin interface SHALL display aggregate subscription metrics including total subscribers by tier, monthly recurring revenue, churn rate, and trial conversion rate


### Requirement 13: Promotional Codes and Discounts

**User Story:** As a user, I want to apply promotional codes to my subscription, so that I can receive discounts or special offers.

#### Acceptance Criteria

1. THE Subscription_System SHALL support promotional codes (coupons) managed through Stripe
2. THE Subscription_System SHALL allow users to enter a promotional code during checkout or subscription upgrade
3. WHEN a valid promotional code is applied, THE Subscription_System SHALL display the discount amount and updated total before payment
4. THE Subscription_System SHALL support percentage-based discounts (e.g., "20% off for 3 months")
5. THE Subscription_System SHALL support fixed-amount discounts (e.g., "$5 off first month")
6. THE Subscription_System SHALL support duration-limited discounts (e.g., "50% off for 6 months, then regular price")
7. THE Subscription_System SHALL support lifetime discounts (e.g., "10% off forever")
8. WHEN a promotional code is applied, THE Subscription_System SHALL store the coupon ID on the Stripe_Subscription
9. IF a user enters an invalid or expired promotional code, THEN THE Subscription_System SHALL display an error message
10. IF a user enters a promotional code they are not eligible for (e.g., "new customers only"), THEN THE Subscription_System SHALL display an error message explaining the restriction
11. THE admin interface SHALL allow Admins to create, view, and deactivate promotional codes through Stripe
12. THE Subscription_System SHALL display applied promotional codes and their remaining duration on the user's account dashboard


### Requirement 14: Tax Calculation and Compliance

**User Story:** As a subscriber, I want taxes to be calculated correctly based on my location, so that my invoice reflects the proper amount due.

#### Acceptance Criteria

1. THE Subscription_System SHALL integrate with Stripe Tax for automatic tax calculation
2. WHEN a user enters a billing address during checkout, THE Subscription_System SHALL calculate applicable sales tax, VAT, or GST based on the address
3. THE Subscription_System SHALL display the tax amount separately from the subscription price on the checkout page and Invoice
4. THE Subscription_System SHALL collect and remit taxes according to local regulations in the user's jurisdiction
5. THE Subscription_System SHALL store the user's billing address and tax ID (if provided) on their Stripe_Customer record
6. THE Subscription_System SHALL allow users to enter a VAT ID for business purchases in applicable regions
7. WHEN a valid VAT ID is provided and verified, THE Subscription_System SHALL apply reverse charge mechanism per EU regulations
8. THE Subscription_System SHALL display the tax-inclusive or tax-exclusive total based on regional conventions (e.g., tax-inclusive in EU, tax-exclusive in US)
9. THE Invoice PDF SHALL include all required tax information per local regulations including tax ID numbers, tax rates, and tax amounts
10. THE Subscription_System SHALL update tax calculations when a user changes their billing address


### Requirement 15: Annual Subscription Handling

**User Story:** As a user, I want to subscribe annually to save money compared to monthly billing, so that I can reduce my total subscription cost.

#### Acceptance Criteria

1. THE Subscription_System SHALL offer annual billing options for all paid Subscription_Tier values at a 20% discount compared to 12 months of monthly billing
2. WHEN a user selects annual billing, THE Subscription_System SHALL display the annual price, monthly equivalent, and total savings
3. WHEN an annual subscription is created, THE Subscription_System SHALL charge the full annual amount upfront
4. WHEN an annual subscription is created, THE Subscription_System SHALL set the next billing date to 365 days from the start date
5. WHEN a user upgrades from monthly to annual billing mid-cycle, THE Subscription_System SHALL calculate a prorated credit for the unused monthly billing and apply it to the annual charge
6. WHEN a user downgrades from annual to monthly billing, THE Subscription_System SHALL schedule the change to take effect at the end of the current annual period
7. WHEN an annual subscription renews, THE Subscription_System SHALL charge the full annual amount and send an invoice
8. THE Subscription_System SHALL send a renewal reminder email 30 days before an annual subscription renews
9. IF an annual subscription payment fails at renewal, THEN THE Subscription_System SHALL follow the same Grace_Period and retry logic as monthly subscriptions
10. WHEN a user cancels an annual subscription, THE Subscription_System SHALL maintain access until the end of the annual period and SHALL NOT issue a pro-rated refund


### Requirement 16: Email Notifications

**User Story:** As a subscriber, I want to receive timely email notifications about my subscription status, so that I stay informed about billing events and subscription changes.

#### Acceptance Criteria

1. THE Subscription_System SHALL send an email notification when a new subscription is activated
2. THE Subscription_System SHALL send an email notification when a subscription payment succeeds, including an invoice attachment
3. THE Subscription_System SHALL send an email notification when a subscription payment fails, including instructions to update the payment method
4. THE Subscription_System SHALL send an email notification 3 days before a trial period ends
5. THE Subscription_System SHALL send an email notification when a trial converts to a paid subscription
6. THE Subscription_System SHALL send an email notification when a subscription is upgraded
7. THE Subscription_System SHALL send an email notification when a subscription is downgraded or downgrade is scheduled
8. THE Subscription_System SHALL send an email notification when a subscription is canceled
9. THE Subscription_System SHALL send an email notification when a canceled subscription expires and access is downgraded
10. THE Subscription_System SHALL send an email notification 30 days before a payment method expires
11. THE Subscription_System SHALL send an email notification 30 days before an annual subscription renews
12. THE Subscription_System SHALL send an email notification when a subscription enters past_due status
13. THE Subscription_System SHALL send an email notification when a past_due subscription is resolved
14. THE Subscription_System SHALL send an email notification when a subscription expires due to failed payment
15. ALL subscription email notifications SHALL include a link to the Billing_Portal for account management
16. THE Subscription_System SHALL allow users to manage email notification preferences (enable/disable non-critical notifications) while keeping payment-related notifications mandatory


### Requirement 17: Security and Fraud Prevention

**User Story:** As a platform owner, I need to prevent fraudulent subscriptions and protect against payment abuse, so that the business remains financially viable.

#### Acceptance Criteria

1. THE Subscription_System SHALL use Stripe Radar for automatic fraud detection on all payment transactions
2. WHEN Stripe Radar flags a payment as high-risk, THE Subscription_System SHALL block the payment and require manual review before activation
3. THE Subscription_System SHALL implement rate limiting on subscription creation attempts (maximum 3 attempts per hour per IP address)
4. THE Subscription_System SHALL block Trial_Period access for users with Payment_Method records flagged by Stripe as fraudulent
5. THE Subscription_System SHALL log all failed payment attempts with IP address, user agent, and failure reason
6. THE admin interface SHALL provide a fraud review queue showing flagged transactions for manual review
7. THE admin interface SHALL allow Admins to approve or reject flagged transactions
8. THE Subscription_System SHALL prevent a user from creating multiple accounts to obtain multiple Trial_Period accesses by tracking Trial_Period usage by email address and Payment_Method fingerprint
9. IF a user attempts to start a Trial_Period with a Payment_Method or email previously used for a trial, THEN THE Subscription_System SHALL reject the trial request
10. THE Subscription_System SHALL implement 3D Secure (SCA) authentication for payment methods in regions where required by regulation
11. THE Subscription_System SHALL use PCI-compliant payment processing by never storing raw credit card numbers in the application database


### Requirement 18: Analytics and Reporting

**User Story:** As a product owner, I want to track subscription metrics and user behavior, so that I can make data-driven decisions about pricing and features.

#### Acceptance Criteria

1. THE Subscription_System SHALL track and display the following metrics in the admin analytics dashboard:
   - Total active subscriptions by tier
   - Monthly recurring revenue (MRR) by tier
   - Annual recurring revenue (ARR)
   - Trial conversion rate
   - Churn rate by tier
   - Average customer lifetime value
   - New subscriptions per month
   - Cancellations per month
   - Upgrade rate (% of users moving to higher tiers)
   - Downgrade rate (% of users moving to lower tiers)
2. THE Subscription_System SHALL track feature usage by Subscription_Tier to identify features that drive upgrades
3. THE Subscription_System SHALL track which features users attempt to access when they hit tier limits
4. THE Subscription_System SHALL generate monthly revenue reports showing total revenue, refunds, and net revenue
5. THE admin interface SHALL display cohort analysis showing retention rates over time for users who subscribed in the same month
6. THE admin interface SHALL display funnel analysis showing conversion rates from Free_Tier to trial to paid subscription
7. THE Subscription_System SHALL track the effectiveness of promotional codes by measuring usage count and conversion rate
8. THE Subscription_System SHALL integrate with analytics platforms (Google Analytics, Mixpanel) to send subscription events
9. THE Subscription_System SHALL export subscription data to CSV for external analysis
10. THE admin interface SHALL allow filtering all metrics by date range, Subscription_Tier, and billing cycle type


### Requirement 19: User Experience and Onboarding

**User Story:** As a new user, I want clear guidance on subscription options and feature differences, so that I can choose the right tier for my needs.

#### Acceptance Criteria

1. THE Subscription_System SHALL display a comparison table on the pricing page showing all Subscription_Tier features and limits side-by-side
2. THE pricing page SHALL highlight the most popular tier with a visual badge (e.g., "Most Popular" on Hero_Tier)
3. THE pricing page SHALL include testimonials or use cases for each tier to help users identify their needs
4. WHEN a Free_Tier user attempts to access a paid feature, THE Subscription_System SHALL display a contextual upgrade prompt explaining the feature and showing which tiers include it
5. THE upgrade prompt SHALL include a "Learn More" link to the full pricing comparison page
6. THE upgrade prompt SHALL include a direct "Upgrade Now" button that navigates to checkout for the lowest tier that includes the feature
7. THE Subscription_System SHALL provide an onboarding wizard for new subscribers showing key features available in their tier
8. THE account dashboard SHALL display the user's current tier with a visual tier badge
9. THE account dashboard SHALL show usage statistics (campaigns, characters, storage) with progress bars and percentage indicators
10. WHEN a user's usage approaches 80% of any limit, THE Subscription_System SHALL display a warning notification suggesting an upgrade
11. THE Subscription_System SHALL provide tier recommendation logic that suggests the optimal tier based on a user's current usage patterns
12. THE Subscription_System SHALL include FAQ sections for common subscription questions (billing, cancellation, refunds) on the pricing and account pages


### Requirement 20: Integration with Other Features

**User Story:** As a developer, I need the subscription system to integrate cleanly with other platform features, so that tier-based restrictions work consistently across all features.

#### Acceptance Criteria

1. THE Subscription_System SHALL provide a GraphQL API endpoint to query a user's current Subscription_Tier and feature entitlements
2. THE Subscription_System SHALL provide a GraphQL API endpoint to check if a user has access to a specific feature by feature name
3. THE Subscription_System SHALL provide a GraphQL API endpoint to check if a user has available quota for a usage limit (campaigns, characters, storage)
4. THE Subscription_System SHALL emit events to the application event bus when subscription status changes (activated, upgraded, downgraded, canceled, expired)
5. OTHER feature modules SHALL subscribe to subscription events to update feature access in real-time
6. THE Character_Creation_System SHALL check the Character_Limit before allowing character creation
7. THE Campaign_System SHALL check the Campaign_Limit before allowing campaign creation
8. THE Asset_Upload_System SHALL check the Storage_Limit before allowing file uploads
9. THE Combat_Tracker SHALL check the subscription tier before allowing access to stat block storage features
10. THE Reference_Lookup_System SHALL check the subscription tier before allowing access to reference content
11. THE Subscription_System SHALL provide middleware or decorators for GraphQL resolvers to enforce feature access control declaratively
12. THE Subscription_System SHALL cache subscription tier and feature entitlements in Redis with a 60-second TTL to minimize database queries
13. WHEN a subscription tier changes, THE Subscription_System SHALL invalidate the cached entitlements immediately
