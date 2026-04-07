# n8n-nodes-idb2b

An n8n community node for integrating with [IDB2B](https://idb2b.com) — AI Agents that turn conversations into customers for WhatsApp, Instagram & TikTok.

[n8n](https://n8n.io/) is a workflow automation platform.

## What is this node?

IDB2B is an AI Agents platform that converts conversations into customers across WhatsApp, Instagram, and TikTok. This node lets you connect n8n to your IDB2B account to automate contact and company management — create, read, update, and delete records without writing code.

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n documentation, or install directly:

```bash
npm install n8n-nodes-idb2b
```

## Credentials

1. In n8n, go to **Credentials → New → IDB2B WhatsApp AI Agents**
2. Fill in:
   - **Email**: Your IDB2B account email
   - **Password**: Your IDB2B account password
   - **Base URL**: `https://api.idb2b.com` (default)
3. Click **Test connection** to verify, then **Save**

## Resources & Operations

### Contact

| Operation | Description |
|-----------|-------------|
| Get All | Retrieve a paginated list of contacts |
| Get | Fetch a single contact by ID |
| Create | Create a new contact |
| Update | Update an existing contact |
| Delete | Delete a contact |

### Company

| Operation | Description |
|-----------|-------------|
| Get All | Retrieve a paginated list of companies |
| Get | Fetch a single company by ID |
| Create | Create a new company |
| Update | Update an existing company |
| Delete | Delete a company |

### Activity

| Operation | Description |
|-----------|-------------|
| Get All | Retrieve all activities for a specific company/lead |
| Get | Fetch a single activity by ID |
| Create | Create a new activity linked to a company or contact |
| Update | Update an existing activity |
| Delete | Delete an activity |

## How to Use

### Basic workflow

1. Add the **IDB2B API** node to your workflow
2. Select your saved credential under **Credential to connect with**
3. Choose a **Resource** (Activity, Contact, or Company)
4. Choose an **Operation** (Get All, Get, Create, Update, Delete)
5. Fill in the required parameters and execute

### Get All Contacts

- **Limit**: Number of contacts per page (default: 50)
- **Page**: Page number (default: 1)
- **Fields to Return**: Optionally select specific fields (id, name, email, phone_number, tags, etc.)
- **Query Parameters**: Add any extra filters supported by the API

### Get All Companies

- **Limit**: Number of companies per page (default: 50)
- **Page**: Page number (default: 1)
- **Fields to Return**: Optionally select specific fields
- **Query Parameters**: Add any extra filters

### Create Contact

Required:
- **Name**: Contact full name

Optional (under Additional Fields):
- **Phone Number**: Can be blank when you only have profile data
- **Email**: Can be blank
- **Job Title**, **Owner ID**, **Company ID**, **Status ID**, **Source ID**
- **LinkedIn URL**: Added as a social link payload
- **Social Links**: Add one or more social profiles
- **Tags**

### Create Company

Required:
- **Name**: Company name

Optional (under Additional Fields):
- **Website**, **Description**, **Industry ID**, **Size ID**, **Status ID**, **Source ID**, **Owner ID**

### Get All Activities

Required:
- **Company ID**: The company/lead to list activities for
- **Limit** / **Page**: Pagination controls

### Create Activity

Required:
- **Subject**: Title of the activity
- **Associate With**: Choose **Company** or **Contact**
- **Company ID** or **Contact ID** depending on the above

Optional (under Additional Fields):
- **Description**, **Date & Time**, **Icon**, **User ID**

### Update Activity

Required:
- **Activity ID**

Optional (under Additional Fields):
- Any fields to change: **Subject**, **Description**, **Date & Time**, **Icon**, **User ID**

## Example Workflows

### Retrieve all contacts and companies

```
Manual Trigger → Get all contacts → Get all companies
```

### Sync new contacts from a webhook

```
Webhook → IDB2B Create Contact
  - Name: {{ $json.name }}
  - Email: {{ $json.email }}
  - Phone: {{ $json.phone }}
  - Additional Fields.LinkedIn URL: {{ $json.linkedin_url }}
```

### Log a call activity after a deal closes

```
Webhook → IDB2B Create Activity
  - Subject: "Call with {{ $json.contact_name }}"
  - Associate With: Company
  - Company ID: {{ $json.company_id }}
  - Additional Fields.Description: {{ $json.call_notes }}
  - Additional Fields.Date & Time: {{ $json.call_time }}
```

### Paginate through all contacts

```
Schedule Trigger → IDB2B Get All Contacts
  - Limit: 100
  - Page: 1
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Watch mode
npm run dev

# Lint
npm run lint
```

## Version History

### v3.2.5
- Added **Activity** resource with full CRUD operations (Get All, Get, Create, Update, Delete)
- Activities can be linked to a company or a contact
- Get All Activities scoped to a specific company via `GET /leads/:id/activities`

### v3.2.4
- Added LinkedIn URL and social links support for contacts
- Included socials in response data for create/update operations

### v2.0.3
- Fixed endpoint paths (`/contacts`, `/companies`)
- Fixed access token parsing from login response
- Added Company resource with full CRUD operations

### v1.0.4
- Added pagination, field selection, and token caching
- Enhanced error handling with HTTP status codes

### v1.0.3
- Initial release with basic contact CRUD operations

## License

MIT
