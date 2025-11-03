# n8n-nodes-idb2b

This is an n8n community node for IDB2B CRM API integration with advanced features for contact management and workflow automation.

[n8n](https://n8n.io/) is a workflow automation platform.

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n documentation.

```bash
npm install n8n-nodes-idb2b
```

## Credentials

Configure the following credentials in n8n:

- **Email**: Your IDB2B account email
- **Password**: Your IDB2B account password
- **Base URL**: Your IDB2B API base URL (default: `https://api-stage.idb2b.com`)

## Features

### 🚀 Performance Optimizations
- **Token Caching**: Automatic authentication token caching (1-hour cache) for 60x faster subsequent requests
- **Field Selection**: Choose specific fields to reduce payload size and improve performance
- **Pagination**: Efficient handling of large contact datasets

### 🛡️ Enhanced Error Handling
- Specific error messages for different HTTP status codes (401, 403, 404, 422, 429, 500)
- Detailed error context with status codes and API response details
- Graceful error recovery with continue-on-fail support

## Contact Operations

### Get All Contacts
Retrieve contacts with advanced filtering and pagination:

**Parameters:**
- **Limit**: Maximum number of contacts to return (default: 50)
- **Page**: Page number for pagination (default: 1)
- **Fields to Return**: Select specific fields (id, name, email, phone_number, tags, etc.)
- **Query Parameters**: Additional custom query parameters

**Supported Fields:**
- `id` - Contact ID
- `name` - Contact name
- `email` - Contact email
- `phone_number` - Phone number
- `organization_id` - Organization ID
- `user_id` - Associated user ID
- `lead_id` - Associated lead ID
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp
- `favorites` - Favorite status
- `tags` - Associated tags

### Create Contact
Create new contacts with comprehensive data validation:

**Required Fields:**
- **Name**: Contact name (validated for non-empty)
- **Email**: Contact email (validated for proper email format)

**Optional Fields:**
- **Phone Number**: Contact phone number
- **User ID**: Associate with specific user
- **Lead ID**: Link to existing lead
- **Favorites**: Mark as favorite (boolean)
- **Tags**: Add multiple tags with names

**Features:**
- ✅ Email format validation
- ✅ Required field validation
- ✅ Data sanitization (automatic trimming)
- ✅ Support for all IDB2B contact fields

## Custom API Operations

For advanced use cases, the node supports custom API requests:

- **GET requests** - Custom endpoint queries
- **POST requests** - Create resources with JSON body
- **PUT requests** - Update resources with JSON body
- **DELETE requests** - Delete resources

**Custom Request Features:**
- Custom endpoints specification
- Query parameters support
- JSON body for POST/PUT requests
- Full HTTP method support

## Example Workflows

### 1. Paginated Contact Retrieval
```
Trigger → IDB2B (Get All Contacts)
- Limit: 100
- Page: 1
- Fields: ["id", "name", "email", "tags"]
```

### 2. Contact Creation with Validation
```
Webhook → IDB2B (Create Contact)
- Name: {{$json.name}}
- Email: {{$json.email}}
- Phone: {{$json.phone}}
- Tags: [{"name": "Website Lead"}]
```

### 3. Custom API Query
```
Schedule → IDB2B (Custom GET)
- Endpoint: /api/v1/reports/contacts
- Query Parameters: {"from": "2024-01-01", "to": "2024-12-31"}
```

## Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Development with watch mode
npm run dev

# Run linting
npm run lint

# Format code
npm run format
```

## Version History

### v1.0.4
- Enhanced contact operations with full API field support
- Added pagination (limit, page) for contact retrieval
- Implemented field selection for optimized responses
- Added comprehensive input validation for contact creation
- Enhanced error handling with specific HTTP status codes
- Added token caching for improved performance
- Updated to use modern n8n httpRequest API

### v1.0.3
- Initial release with basic CRUD operations

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT
