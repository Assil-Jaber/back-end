# API Documentation

**Base URL:** `http://localhost:5000`

---

## Authentication

All protected endpoints require a JWT token in the `Authorization` header:

```
Authorization: Bearer <your_token>
```

---

## Endpoints

### 1. Auth

#### POST `/api/auth/register`

Register a new user account.

- **Auth required:** No

**Request Body:**

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "Test123"
}
```

**Validation Rules:**

| Field    | Rule                                                                 |
| -------- | -------------------------------------------------------------------- |
| name     | Required, 2–50 characters                                           |
| email    | Required, must be valid email format                                 |
| password | Required, min 6 characters, at least 1 uppercase, 1 lowercase, 1 number |

**Success Response:** `201 Created`

```json
{
  "message": "User registered successfully",
  "userId": 1
}
```

**Error Responses:**

| Status | Message                              |
| ------ | ------------------------------------ |
| 400    | Name, email, and password are required |
| 400    | Name must be between 2 and 50 characters |
| 400    | Please provide a valid email address |
| 400    | Password must be at least 6 characters with 1 uppercase, 1 lowercase, and 1 number |
| 409    | Email already registered             |

---

#### POST `/api/auth/login`

Login and receive a JWT token.

- **Auth required:** No

**Request Body:**

```json
{
  "email": "john@example.com",
  "password": "Test123"
}
```

**Validation Rules:**

| Field    | Rule                                 |
| -------- | ------------------------------------ |
| email    | Required, must be valid email format |
| password | Required                             |

**Success Response:** `200 OK`

```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

**Error Responses:**

| Status | Message                              |
| ------ | ------------------------------------ |
| 400    | Email and password are required      |
| 400    | Please provide a valid email address |
| 401    | Invalid email or password            |

---

### 2. Users

#### GET `/api/users/me`

Get the currently logged-in user's profile.

- **Auth required:** Yes

**Success Response:** `200 OK`

```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com",
  "created_at": "2026-04-26 12:00:00"
}
```

**Error Responses:**

| Status | Message                                |
| ------ | -------------------------------------- |
| 401    | No token provided, access denied       |
| 401    | Invalid or expired token               |
| 404    | User not found                         |

---

### 3. Posts

> All post endpoints require authentication.

#### GET `/api/posts`

Get all posts for the logged-in user.

- **Auth required:** Yes

**Success Response:** `200 OK`

```json
[
  {
    "id": 1,
    "title": "My First Post",
    "content": "Hello World!",
    "user_id": 1,
    "created_at": "2026-04-26 12:00:00"
  }
]
```

---

#### POST `/api/posts`

Create a new post.

- **Auth required:** Yes

**Request Body:**

```json
{
  "title": "My First Post",
  "content": "This is the content of my post."
}
```

**Validation Rules:**

| Field   | Rule                          |
| ------- | ----------------------------- |
| title   | Required, 2–200 characters   |
| content | Required, 2–5000 characters  |

**Success Response:** `201 Created`

```json
{
  "message": "Post created",
  "post": {
    "id": 1,
    "title": "My First Post",
    "content": "This is the content of my post.",
    "user_id": 1
  }
}
```

**Error Responses:**

| Status | Message                                      |
| ------ | -------------------------------------------- |
| 400    | Title and content are required               |
| 400    | Title must be between 2 and 200 characters   |
| 400    | Content must be between 2 and 5000 characters |

---

#### PUT `/api/posts/:id`

Update a post (only the owner can update).

- **Auth required:** Yes

**URL Params:**

| Param | Type    | Description |
| ----- | ------- | ----------- |
| id    | Integer | Post ID     |

**Request Body (all fields optional):**

```json
{
  "title": "Updated Title",
  "content": "Updated content."
}
```

**Validation Rules:**

| Field   | Rule                                   |
| ------- | -------------------------------------- |
| id      | Must be a positive integer             |
| title   | Optional, 2–200 characters if provided |
| content | Optional, 2–5000 characters if provided |

**Success Response:** `200 OK`

```json
{
  "message": "Post updated"
}
```

**Error Responses:**

| Status | Message                              |
| ------ | ------------------------------------ |
| 400    | Invalid post ID                      |
| 400    | Title must be between 2 and 200 characters |
| 400    | Content must be between 2 and 5000 characters |
| 404    | Post not found or not authorized     |

---

#### DELETE `/api/posts/:id`

Delete a post (only the owner can delete).

- **Auth required:** Yes

**URL Params:**

| Param | Type    | Description |
| ----- | ------- | ----------- |
| id    | Integer | Post ID     |

**Success Response:** `200 OK`

```json
{
  "message": "Post deleted"
}
```

**Error Responses:**

| Status | Message                          |
| ------ | -------------------------------- |
| 400    | Invalid post ID                  |
| 404    | Post not found or not authorized |

---

## Database Schema

### users

| Column     | Type     | Constraints          |
| ---------- | -------- | -------------------- |
| id         | INTEGER  | PRIMARY KEY, AUTO    |
| name       | TEXT     | NOT NULL             |
| email      | TEXT     | NOT NULL, UNIQUE     |
| password   | TEXT     | NOT NULL (hashed)    |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |

### posts

| Column     | Type     | Constraints                    |
| ---------- | -------- | ------------------------------ |
| id         | INTEGER  | PRIMARY KEY, AUTO              |
| title      | TEXT     | NOT NULL                       |
| content    | TEXT     | NOT NULL                       |
| user_id    | INTEGER  | FOREIGN KEY → users(id)        |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP      |

---

## How to Run

```bash
# Install dependencies
npm install

# Start development server (with auto-restart)
npm run dev

# Start production server
npm start
```

## Environment Variables

Copy `.env.example` to `.env` and update the values:

| Variable       | Default                          | Description            |
| -------------- | -------------------------------- | ---------------------- |
| PORT           | 5000                             | Server port            |
| JWT_SECRET     | change-this-to-a-strong-secret   | Secret key for JWT     |
| JWT_EXPIRES_IN | 1h                               | Token expiration time  |
