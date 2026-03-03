import { INodeProperties } from 'n8n-workflow';

export const contactOperations: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	displayOptions: {
		show: {
			resource: ['contact'],
		},
	},
	options: [
		{
			name: 'Get All',
			value: 'getAll',
			action: 'Get all contacts',
			description: 'Retrieve all contacts',
		},
		{
			name: 'Get',
			value: 'get',
			action: 'Get a contact',
			description: 'Get a single contact by ID',
		},
		{
			name: 'Create',
			value: 'create',
			action: 'Create a contact',
			description: 'Create a new contact',
		},
		{
			name: 'Update',
			value: 'update',
			action: 'Update a contact',
			description: 'Update an existing contact',
		},
		{
			name: 'Delete',
			value: 'delete',
			action: 'Delete a contact',
			description: 'Delete a contact by ID',
		},
	],
	default: 'getAll',
};

export const contactFields: INodeProperties[] = [
	// Contact ID field for operations that require it
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['get', 'update', 'delete'],
			},
		},
		description: 'ID of the contact',
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['create'],
			},
		},
		description: 'Contact name',
	},
	// Name field for update operations (optional)
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['update'],
			},
		},
		description: 'Contact name (leave empty to keep current value)',
	},
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['create'],
			},
		},
		description: 'Contact email',
	},
	// Email field for update operations (optional)
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['update'],
			},
		},
		description: 'Contact email (leave empty to keep current value)',
	},
	{
		displayName: 'Phone Number',
		name: 'phone_number',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['create'],
			},
		},
		description: 'Contact phone number',
	},
	// Phone Number field for update operations (optional)
	{
		displayName: 'Phone Number',
		name: 'phone_number',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['update'],
			},
		},
		description: 'Contact phone number (leave empty to keep current value)',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['create', 'update'],
			},
		},
		options: [
			{
				displayName: 'Company',
				name: 'company',
				type: 'string',
				default: '',
				description: 'Company name (for CRM integration)',
			},
			{
				displayName: 'Company ID',
				name: 'company_id',
				type: 'string',
				default: '',
				description: 'ID of the company/lead to associate with this contact',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				default: 'Lead',
				description: 'Contact status in sales pipeline',
				options: [
					{ name: 'Lead', value: 'Lead' },
					{ name: 'Qualified', value: 'Qualified' },
					{ name: 'Proposal', value: 'Proposal' },
					{ name: 'Negotiation', value: 'Negotiation' },
					{ name: 'Closed', value: 'Closed' },
					{ name: 'Lost', value: 'Lost' },
				],
			},
			{
				displayName: 'Priority',
				name: 'priority',
				type: 'options',
				default: 'Medium',
				description: 'Contact priority level',
				options: [
					{ name: 'High', value: 'High' },
					{ name: 'Medium', value: 'Medium' },
					{ name: 'Low', value: 'Low' },
				],
			},
			{
				displayName: 'Estimated Value',
				name: 'estimated_value',
				type: 'number',
				default: 0,
				description: 'Estimated deal value',
			},
			{
				displayName: 'Account Owner',
				name: 'account_owner',
				type: 'string',
				default: '',
				description: 'Sales representative or account owner',
			},
			{
				displayName: 'Position',
				name: 'position',
				type: 'string',
				default: '',
				description: 'Job title or position',
			},
			{
				displayName: 'User ID',
				name: 'user_id',
				type: 'string',
				default: '',
				description: 'ID of the user to associate with this contact',
			},
			{
				displayName: 'Lead ID',
				name: 'lead_id',
				type: 'string',
				default: '',
				description: 'ID of the lead to associate with this contact (optional)',
			},
			{
				displayName: 'Favorites',
				name: 'favorites',
				type: 'boolean',
				default: false,
				description: 'Mark contact as favorite',
			},
			{
				displayName: 'Tags',
				name: 'tags',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				placeholder: 'Add Tag',
				description: 'Tags to associate with the contact',
				options: [
					{
						name: 'tag',
						displayName: 'Tag',
						values: [
							{
								displayName: 'Tag Name',
								name: 'name',
								type: 'string',
								default: '',
								required: true,
							},
						],
					},
				],
			},
		],
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		description: 'Maximum number of contacts to return',
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['getAll'],
			},
		},
	},
	{
		displayName: 'Page',
		name: 'page',
		type: 'number',
		default: 1,
		description: 'Page number to retrieve',
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['getAll'],
			},
		},
	},
	{
		displayName: 'Fields to Return',
		name: 'fields',
		type: 'multiOptions',
		default: [],
		description: 'Select specific fields to return (leave empty for all fields)',
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				name: 'ID',
				value: 'id',
			},
			{
				name: 'Name',
				value: 'name',
			},
			{
				name: 'Email',
				value: 'email',
			},
			{
				name: 'Phone Number',
				value: 'phone_number',
			},
			{
				name: 'Company',
				value: 'company',
			},
			{
				name: 'Company ID',
				value: 'company_id',
			},
			{
				name: 'Status',
				value: 'status',
			},
			{
				name: 'Priority',
				value: 'priority',
			},
			{
				name: 'Estimated Value',
				value: 'estimated_value',
			},
			{
				name: 'Account Owner',
				value: 'account_owner',
			},
			{
				name: 'Position',
				value: 'position',
			},
			{
				name: 'Lead ID',
				value: 'lead_id',
			},
			{
				name: 'Organization ID',
				value: 'organization_id',
			},
			{
				name: 'Created At',
				value: 'created_at',
			},
			{
				name: 'Updated At',
				value: 'updated_at',
			},
			{
				name: 'Favorites',
				value: 'favorites',
			},
			{
				name: 'Tags',
				value: 'tags',
			},
		],
	},
	{
		displayName: 'Query Parameters',
		name: 'queryParameters',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		default: {},
		placeholder: 'Add Parameter',
		description: 'Additional query parameters',
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				name: 'parameter',
				displayName: 'Parameter',
				values: [
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
					},
				],
			},
		],
	},
];