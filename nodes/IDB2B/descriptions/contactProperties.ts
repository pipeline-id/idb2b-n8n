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
			name: 'Create',
			value: 'create',
			action: 'Create a contact',
			description: 'Create a new contact',
		},
	],
	default: 'getAll',
};

export const contactFields: INodeProperties[] = [
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
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['create'],
			},
		},
		options: [
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
				description: 'ID of the lead to associate with this contact',
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