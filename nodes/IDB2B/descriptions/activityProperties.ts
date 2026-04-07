import { INodeProperties } from 'n8n-workflow';

export const activityOperations: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	displayOptions: {
		show: {
			resource: ['activity'],
		},
	},
	options: [
		{
			name: 'Get All',
			value: 'getAll',
			action: 'Get all activities for a company',
			description: 'Retrieve all activities for a specific company/lead',
		},
		{
			name: 'Get',
			value: 'get',
			action: 'Get an activity',
			description: 'Get a single activity by ID',
		},
		{
			name: 'Create',
			value: 'create',
			action: 'Create an activity',
			description: 'Create a new activity for a company or contact',
		},
		{
			name: 'Update',
			value: 'update',
			action: 'Update an activity',
			description: 'Update an existing activity',
		},
		{
			name: 'Delete',
			value: 'delete',
			action: 'Delete an activity',
			description: 'Delete an activity by ID',
		},
	],
	default: 'getAll',
};

export const activityFields: INodeProperties[] = [
	// Activity ID — required for get, update, delete
	{
		displayName: 'Activity ID',
		name: 'activityId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['activity'],
				operation: ['get', 'update', 'delete'],
			},
		},
		description: 'ID of the activity',
	},
	// Company ID — required for getAll (scoped to company), optional for create
	{
		displayName: 'Company ID',
		name: 'companyId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['activity'],
				operation: ['getAll'],
			},
		},
		description: 'ID of the company/lead to list activities for',
	},
	// Subject — required for create
	{
		displayName: 'Subject',
		name: 'subject',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['activity'],
				operation: ['create'],
			},
		},
		description: 'Subject of the activity',
	},
	// Association — required for create (company OR contact)
	{
		displayName: 'Associate With',
		name: 'associateWith',
		type: 'options',
		default: 'company',
		required: true,
		displayOptions: {
			show: {
				resource: ['activity'],
				operation: ['create'],
			},
		},
		options: [
			{ name: 'Company', value: 'company' },
			{ name: 'Contact', value: 'contact' },
		],
		description: 'Whether to link this activity to a company or a contact',
	},
	{
		displayName: 'Company ID',
		name: 'activityCompanyId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['activity'],
				operation: ['create'],
				associateWith: ['company'],
			},
		},
		description: 'ID of the company/lead to associate this activity with',
	},
	{
		displayName: 'Contact ID',
		name: 'activityContactId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['activity'],
				operation: ['create'],
				associateWith: ['contact'],
			},
		},
		description: 'ID of the contact to associate this activity with',
	},
	// Additional fields for create/update
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['activity'],
				operation: ['create', 'update'],
			},
		},
		options: [
			{
				displayName: 'Subject',
				name: 'subject',
				type: 'string',
				default: '',
				description: 'Subject of the activity (for update)',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				typeOptions: {
					rows: 4,
				},
				default: '',
				description: 'Description or notes for the activity',
			},
			{
				displayName: 'Date & Time',
				name: 'datetime',
				type: 'dateTime',
				default: '',
				description: 'Date and time of the activity (ISO 8601)',
			},
			{
				displayName: 'Icon',
				name: 'icon',
				type: 'string',
				default: '',
				description: 'Icon identifier for the activity',
			},
			{
				displayName: 'User ID',
				name: 'user_id',
				type: 'string',
				default: '',
				description: 'UUID of the user to associate with the activity',
			},
		],
	},
	// Pagination for getAll
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		description: 'Maximum number of activities to return',
		displayOptions: {
			show: {
				resource: ['activity'],
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
				resource: ['activity'],
				operation: ['getAll'],
			},
		},
	},
];
