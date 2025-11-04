import { INodeProperties } from 'n8n-workflow';

export const leadOperations: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	displayOptions: {
		show: {
			resource: ['lead'],
		},
	},
	options: [
		{
			name: 'Get All',
			value: 'getAll',
			action: 'Get all leads',
			description: 'Retrieve all leads',
		},
		{
			name: 'Create',
			value: 'create',
			action: 'Create a lead',
			description: 'Create a new lead',
		},
	],
	default: 'getAll',
};

export const leadFields: INodeProperties[] = [
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['lead'],
				operation: ['create'],
			},
		},
		description: 'Lead name',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['lead'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Owner ID',
				name: 'owner_id',
				type: 'string',
				default: '',
				description: 'ID of the user who owns this lead',
			},
			{
				displayName: 'Website',
				name: 'website',
				type: 'string',
				default: '',
				description: 'Lead website URL',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'Lead description',
			},
			{
				displayName: 'Status ID',
				name: 'status_id',
				type: 'string',
				default: '',
				description: 'Lead status ID',
			},
			{
				displayName: 'Source ID',
				name: 'source_id',
				type: 'string',
				default: '',
				description: 'Lead source ID',
			},
			{
				displayName: 'Size ID',
				name: 'size_id',
				type: 'string',
				default: '',
				description: 'Lead size ID',
			},
			{
				displayName: 'Industry ID',
				name: 'industry_id',
				type: 'string',
				default: '',
				description: 'Lead industry ID',
			},
			{
				displayName: 'Main Contact ID',
				name: 'main_contact_id',
				type: 'string',
				default: '',
				description: 'ID of the main contact for this lead',
			},
			{
				displayName: 'Contact Name',
				name: 'contact_name',
				type: 'string',
				default: '',
				description: 'Name of the main contact',
			},
			{
				displayName: 'Contact Email',
				name: 'contact_email',
				type: 'string',
				default: '',
				description: 'Email of the main contact',
			},
			{
				displayName: 'Contact Phone Number',
				name: 'contact_phone_number',
				type: 'string',
				default: '',
				description: 'Phone number of the main contact',
			},
		],
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		description: 'Maximum number of leads to return',
		displayOptions: {
			show: {
				resource: ['lead'],
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
				resource: ['lead'],
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
				resource: ['lead'],
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
				name: 'Website',
				value: 'website',
			},
			{
				name: 'Description',
				value: 'description',
			},
			{
				name: 'Owner ID',
				value: 'owner_id',
			},
			{
				name: 'Status ID',
				value: 'status_id',
			},
			{
				name: 'Source ID',
				value: 'source_id',
			},
			{
				name: 'Size ID',
				value: 'size_id',
			},
			{
				name: 'Industry ID',
				value: 'industry_id',
			},
			{
				name: 'Main Contact ID',
				value: 'main_contact_id',
			},
			{
				name: 'Contact Name',
				value: 'contact_name',
			},
			{
				name: 'Contact Email',
				value: 'contact_email',
			},
			{
				name: 'Contact Phone Number',
				value: 'contact_phone_number',
			},
			{
				name: 'Created At',
				value: 'created_at',
			},
			{
				name: 'Updated At',
				value: 'updated_at',
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
				resource: ['lead'],
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