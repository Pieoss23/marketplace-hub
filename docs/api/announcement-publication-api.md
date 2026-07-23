# Announcement & Publication API Contracts

This document contains the frozen REST API endpoints, DTO contracts, and expected responses for the V1 release.

**Authentication**: every endpoint below requires `Authorization: Bearer <accessToken>`,
obtained from `POST /api/auth/signup` or `POST /api/auth/login` (see
`docs/architecture/overview.md`). Missing or invalid tokens return `401`.

---

## 1. Announcement Management Endpoints

### 1.1 Create Announcement
Create a central announcement.
* **Method**: `POST`
* **Path**: `/api/announcements`
* **Request Body** (`CreateAnnouncementRequest`):
```json
{
  "title": "Tastiera meccanica vintage",
  "description": "Bellissima tastiera meccanica IBM Model M del 1989.",
  "priceAmount": 15000,
  "currency": "EUR",
  "categoryCode": "electronics",
  "condition": "USED_GOOD",
  "quantity": 1
}
```
* **Success Response**: `201 Created` (`AnnouncementResponse`)

---

### 1.2 Get All Announcements
Retrieve a list of all central announcements.
* **Method**: `GET`
* **Path**: `/api/announcements`
* **Success Response**: `200 OK` (`AnnouncementResponse[]`)

---

### 1.3 Get Announcement by ID
Retrieve details of a specific announcement by its unique identifier.
* **Method**: `GET`
* **Path**: `/api/announcements/:id`
* **Success Response**: `200 OK` (`AnnouncementResponse`)

---

### 1.4 Update Announcement
Replace/update an existing announcement.
* **Method**: `PUT`
* **Path**: `/api/announcements/:id`
* **Request Body** (`UpdateAnnouncementRequest`): Same structure as `CreateAnnouncementRequest`.
* **Success Response**: `200 OK` (`AnnouncementResponse`)

---

### 1.5 Delete Announcement
Delete an announcement and, via cascade, its channel configurations and publication history.
* **Method**: `DELETE`
* **Path**: `/api/announcements/:id`
* **Success Response**: `204 No Content`
* **Error Response**: `404 Not Found` if the announcement does not exist.

---

## 2. Channel & Publication Endpoints

### 2.1 Enable or Configure Channel
Enable a marketplace channel for a specific announcement and update its specific configuration.
* **Method**: `PUT`
* **Path**: `/api/announcements/:id/channels/:connectorCode`
* **Request Body** (`EnableAnnouncementChannelRequest`):
```json
{
  "connectorCode": "mock",
  "enabled": true,
  "configuration": {
    "category": "vintage_keyboards"
  }
}
```
* **Success Response**: `200 OK` (`AnnouncementResponse`)

---

### 2.2 Validate Channel Configuration
Perform dry-run validation on the announcement and the channel-specific configuration.
* **Method**: `POST`
* **Path**: `/api/announcements/:id/channels/:connectorCode/validate`
* **Success Response**: `200 OK` (`ChannelValidationResponse`):
```json
{
  "valid": false,
  "issues": [
    {
      "code": "mock.title.too_long",
      "message": "Title must not exceed 80 characters for this channel.",
      "field": "title",
      "severity": "ERROR",
      "connectorCode": "mock",
      "metadata": {}
    }
  ],
  "validatedAt": "2026-07-12T14:00:00.000Z"
}
```

---

### 2.3 Publish Announcement
Trigger the publication workflow for a specific channel.
* **Method**: `POST`
* **Path**: `/api/announcements/:id/channels/:connectorCode/publish`
* **Success Response**: `200 OK` (`PublishAnnouncementResponse`):
```json
{
  "publicationId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "status": "PUBLISHED",
  "connectorCode": "mock",
  "externalListingId": "mock-external-12345",
  "externalUrl": "http://mock-marketplace.local/listing/mock-external-12345",
  "publishedAt": "2026-07-12T14:00:02.000Z"
}
```

---

### 2.4 Get Publication History
Retrieve all publication attempts for a specific announcement, sorted from most recent to oldest.
* **Method**: `GET`
* **Path**: `/api/announcements/:id/publications`
* **Success Response**: `200 OK` (`PublishAnnouncementResponse[]`)

---

## 3. Standard API Error Response
All validation and system errors return a structured response payload:
* **Status Code**: `400 Bad Request` or `422 Unprocessable Entity`
* **Response Body** (`ApiErrorResponse`):
```json
{
  "code": "VALIDATION_FAILED",
  "message": "One or more validation rules failed.",
  "field": "title",
  "details": [
    {
      "code": "announcement.title.too_long",
      "message": "Title must not exceed 120 characters.",
      "field": "title",
      "severity": "ERROR"
    }
  ]
}
```
