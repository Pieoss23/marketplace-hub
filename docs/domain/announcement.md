# Announcement Domain Model

The `Announcement` is the central core model in Marketplace Hub, representing a single product listing intended for cross-publishing.

---

## 1. Domain Entities & Enums

### ProductCondition
Defines the state of the product:
- `NEW`: Brand new item in its original packaging.
- `LIKE_NEW`: Open box, mint condition, no signs of wear.
- `USED_GOOD`: Used, with minor signs of wear but fully functional.
- `USED_ACCEPTABLE`: Heavily used, with visible wear but functional.
- `FOR_PARTS`: Broken, sold for parts or repair.

### AnnouncementStatus
Defines the overall state of the central listing:
- `DRAFT`: Incomplete or not validated.
- `READY`: Validated and ready to be published to one or more channels.
- `PARTIALLY_PUBLISHED`: Successfully published to some enabled channels, but failed or pending on others.
- `PUBLISHED`: Successfully published to all enabled channels.

### PublicationStatus
Defines the independent state of the announcement on a specific connector channel:
- `READY`: Validated and waiting to be sent to the marketplace.
- `PUBLISHING`: In-progress api call or job transmitting payload to the marketplace.
- `PUBLISHED`: Successfully published, with external listing ID and URL.
- `FAILED`: Failed publishing attempt, with structured error logs and messages.

---

## 2. Validation Rules

A central `Announcement` must satisfy the following validation rules to be considered valid and transition to `READY`:

1. **Title**: Required, non-empty, and maximum of 120 characters.
2. **Description**: Required and non-empty.
3. **Price**: Expressed as a positive integer (> 0) representing the amount in minor currency units (cents).
4. **Currency**: Must initially be `EUR`.
5. **Quantity**: Must be an integer greater than zero.
6. **Category**: Must be a non-empty category code.
7. **Condition**: Must be a valid `ProductCondition`.

### Validation Issues
When validation fails, a list of `ValidationIssue` is returned:
- `code`: Machine-readable unique error code (e.g., `'announcement.title.required'`).
- `message`: Human-readable error message.
- `field`: The path of the invalid field (e.g., `'title'`).
- `severity`: Severity level (`ERROR`, `WARNING`, `INFO`).
- `connectorCode`: Optional code if the issue is connector-specific.
- `metadata`: Optional structured metadata dictionary.

> [!IMPORTANT]
> **Publication Block**: Publication to any channel is strictly forbidden if there are any validation issues with severity `ERROR` present on the Announcement.
