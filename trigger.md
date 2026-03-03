# IDB2B Trigger Nodes - Product Requirements Document (PRD)

## Overview

This document outlines the requirements for implementing trigger nodes for the IDB2B N8N integration. Triggers enable real-time automation by detecting when specific events occur in the IDB2B CRM system, allowing workflows to respond immediately to data changes.

## Problem Statement

Currently, the IDB2B N8N node only supports action-based operations (CRUD). Users cannot automatically respond to events like:

* New contacts being created
* Company status changes
* Contact updates from external sources
* Data synchronization events

This limits automation capabilities and requires manual triggering or complex polling setups.

## Business Objectives

1. Enable real-time automation: Allow workflows to respond instantly to IDB2B events
2. Reduce manual work: Automate repetitive tasks triggered by data changes
3. Improve data sync: Enable bi-directional sync with other CRM and marketing tools
4. Match industry standards: Provide trigger capabilities similar to HubSpot, Salesforce, etc.
5. Enhance user experience: Simplify complex automation workflows

## Target Users

* CRM administrators: Setting up automated company management workflows
* Marketing teams: Automating email campaigns based on contact changes
* Sales teams: Getting real-time notifications for hot companies
* Operations teams: Synchronizing data across multiple systems

## Technical Requirements

### Phase 1: Polling-Based Triggers (Immediate Implementation)

Since the IDB2B API may not have webhook support, implement polling-based triggers that check for changes at regular intervals.

#### Core Trigger Types

1. Contact Triggers

```
- On Contact Created
- On Contact Updated
- On Contact Deleted
- On Contact Status Changed
```

2. Company Triggers

```
- On Company Created
- On Company Updated
- On Company Deleted
- On Company Status Changed
```

#### Technical Implementation

File Structure:

```
nodes/IDB2B/
  triggers/
    IDB2BContactTrigger.node.ts
    IDB2BCompanyTrigger.node.ts
    descriptions/
      contactTriggerProperties.ts
      companyTriggerProperties.ts
  shared/
    TriggerBase.ts
```

Polling Strategy:

* Default polling interval: 1 minute (configurable)
* Use created_at and updated_at timestamps to detect changes
* Store last check timestamp to avoid duplicates
* Implement exponential backoff for API rate limiting

Memory Management:

* Cache last processed record IDs
* Implement sliding window for change detection
* Clean up old cache entries automatically

### Phase 2: Webhook Support (Future Enhancement)

If or when IDB2B implements webhook support, migrate to real-time triggers.

#### Webhook Requirements for IDB2B Backend Team

API Endpoints Needed:

```
POST /api/webhooks/subscribe
- Subscribe to specific events
- Configure callback URL
- Set event types and filters

GET /api/webhooks
- List active subscriptions
- Check webhook status

PUT /api/webhooks/{id}
- Update webhook configuration
- Modify event subscriptions

DELETE /api/webhooks/{id}
- Unsubscribe from webhooks
- Clean up subscriptions
```

Event Payload Format:

```json
{
  "event_id": "evt_123456789",
  "event_type": "company.created",
  "timestamp": "2025-01-19T22:30:00Z",
  "organization_id": "org_123",
  "data": {
    "object": "company",
    "action": "created",
    "company": {},
    "changes": {}
  }
}
```

Supported Event Types:

```
contact.created
contact.updated
contact.deleted
contact.status_changed
company.created
company.updated
company.deleted
company.status_changed
```

## User Interface Specifications

### Trigger Configuration

Common Properties for All Triggers:

* Polling Interval: Dropdown (30s, 1m, 5m, 15m, 30m, 1h)
* Event Type: Multi-select specific events to watch
* Filters: Optional filters by status, tags, owner, etc.
* Batch Size: Number of records to process per poll (default: 50)

Contact Trigger Properties:

```typescript
{
  displayName: 'Event Types',
  name: 'events',
  type: 'multiOptions',
  default: ['created'],
  options: [
    { name: 'Contact Created', value: 'created' },
    { name: 'Contact Updated', value: 'updated' },
    { name: 'Contact Deleted', value: 'deleted' },
    { name: 'Status Changed', value: 'status_changed' }
  ]
}
```

Company Trigger Properties:

```typescript
{
  displayName: 'Event Types',
  name: 'events',
  type: 'multiOptions',
  default: ['created'],
  options: [
    { name: 'Company Created', value: 'created' },
    { name: 'Company Updated', value: 'updated' },
    { name: 'Company Deleted', value: 'deleted' },
    { name: 'Status Changed', value: 'status_changed' }
  ]
}
```

Advanced Filters:

```typescript
{
  displayName: 'Filters',
  name: 'filters',
  type: 'collection',
  options: [
    {
      displayName: 'Status',
      name: 'status',
      type: 'multiOptions',
      options: [
        { name: 'Prospect', value: 'Prospect' },
        { name: 'Qualified', value: 'Qualified' },
        { name: 'Closed', value: 'Closed' }
      ]
    },
    {
      displayName: 'Tags',
      name: 'tags',
      type: 'string',
      placeholder: 'tag1,tag2'
    }
  ]
}
```

## Technical Specifications

### Data Flow

1. Trigger Activation

   * User configures trigger node in N8N workflow
   * Node begins polling IDB2B API at specified interval
   * Stores last check timestamp in workflow memory

2. Change Detection

   * Query API with updated_at > last_check_time
   * Compare results with previous poll
   * Identify new, updated, or deleted records

3. Event Processing

   * Filter events based on user configuration
   * Format data according to N8N standards
   * Emit trigger events to workflow

4. Error Handling

   * Retry logic for API failures
   * Graceful degradation for rate limits
   * Detailed error logging

### API Integration Requirements

Endpoint Enhancements Needed:

```
GET /api/contacts?updated_after=TIMESTAMP&limit=50
GET /api/companies?updated_after=TIMESTAMP&limit=50
```

Response Format:

```json
{
  "data": [],
  "pagination": {
    "has_more": true,
    "next_cursor": "cursor_value"
  },
  "meta": {
    "total_changes": 25,
    "last_modified": "2025-01-19T22:30:00Z"
  }
}
```

Required Fields for Change Detection:

* created_at: ISO timestamp
* updated_at: ISO timestamp
* deleted_at: ISO timestamp (for soft deletes)
* version: Incremental version number (optional)

## Performance Requirements

* Polling efficiency: Minimal API calls per interval
* Memory usage: Less than 10MB per active trigger node
* Response time: Trigger events within 2x polling interval
* Scalability: Support 100+ concurrent trigger nodes
* Rate limiting: Respect IDB2B API limits (configurable)

## Security Requirements

* Authentication: Use existing IDB2B credential system
* Data privacy: No sensitive data in trigger node logs
* Access control: Respect user permissions from IDB2B
* Secure storage: Encrypted storage of polling state

## Testing Requirements

### Unit Tests

* Polling mechanism accuracy
* Change detection logic
* Filter application
* Error handling scenarios

### Integration Tests

* End-to-end trigger workflows
* API error conditions
* Rate limiting behavior
* Memory leak detection

### User Acceptance Tests

* Trigger reliability under load
* Configuration ease of use
* Event delivery accuracy
* Performance benchmarks

## Implementation Timeline

### Phase 1: Core Polling Triggers (4 Weeks)

* Week 1: Base trigger infrastructure
* Week 2: Contact trigger implementation
* Week 3: Company trigger implementation
* Week 4: Testing and documentation

### Phase 2: Enhanced Features (2 Weeks)

* Week 5: Advanced filtering options
* Week 6: Performance optimizations

### Phase 3: Webhook Migration (TBD)

* Dependent on IDB2B backend webhook implementation
* Estimated 2 to 3 weeks after webhook API is ready

## Success Metrics

* Adoption rate: More than 50 percent of IDB2B users enable triggers within 3 months
* Reliability: More than 99.5 percent trigger delivery rate
* Performance: Less than 5 second average trigger response time
* User satisfaction: More than 4.5 out of 5 rating in user feedback

## Risk Mitigation

* API rate limits: Implement intelligent backoff and caching
* Data volume: Add pagination and batch processing
* Memory leaks: Regular cleanup of polling state
* Network issues: Robust retry logic with exponential backoff

## Future Enhancements

1. Smart triggers: AI-based event prediction and filtering
2. Bulk operations: Trigger on batch data changes
3. Cross-entity triggers: Trigger on related record changes
4. Custom events: User-defined trigger conditions
5. Analytics dashboard: Trigger performance monitoring

## Documentation Requirements

1. User guide: How to configure and use triggers
2. Technical documentation: Implementation details for developers
3. API documentation: Webhook endpoints and payloads
4. Troubleshooting guide: Common issues and solutions
5. Best practices: Optimal trigger configuration patterns

## Appendix

### Example Use Cases

1. Company Nurturing Automation

```
Trigger: On Company Created
- Add to email sequence
- Create follow-up tasks
- Notify sales team
```

2. Data Synchronization

```
Trigger: On Contact Updated
- Sync to Google Sheets
- Update Mailchimp subscriber
- Log change in Slack
```

3. Sales Pipeline Management

```
Trigger: On Company Status Changed to "Qualified"
- Create deal in CRM
- Schedule demo call
- Send contract template
```

### Competitive Analysis

HubSpot: 18 different trigger types with granular filtering
Salesforce: Real-time triggers with workflow rules
Pipedrive: Webhook-based triggers for all major events

IDB2B Opportunity: Provide simpler, more intuitive trigger setup than competitors while maintaining powerful automation capabilities.

## Priority Implementation Order

### Immediate Priority (Week 1 to 2)

1. On Contact Created
2. On Company Created
3. On Contact Updated

### Medium Priority (Week 3 to 4)

4. On Company Updated
5. On Contact Status Changed
6. On Company Status Changed

### Lower Priority (Future Phases)

7. On Contact Deleted
8. On Company Deleted

This PRD provides the engineering team with everything needed to implement comprehensive trigger functionality for the IDB2B N8N integration.
