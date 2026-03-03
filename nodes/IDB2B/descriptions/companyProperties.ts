import { INodeProperties } from 'n8n-workflow';

export const companyOperations: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	displayOptions: {
		show: {
			resource: ['company'],
		},
	},
	options: [
		{
			name: 'Get All',
			value: 'getAll',
			action: 'Get all companies',
			description: 'Retrieve all companies',
		},
		{
			name: 'Get',
			value: 'get',
			action: 'Get a company',
			description: 'Get a single company by ID',
		},
		{
			name: 'Create',
			value: 'create',
			action: 'Create a company',
			description: 'Create a new company',
		},
		{
			name: 'Update',
			value: 'update',
			action: 'Update a company',
			description: 'Update an existing company',
		},
		{
			name: 'Delete',
			value: 'delete',
			action: 'Delete a company',
			description: 'Delete a company by ID',
		},
	],
	default: 'getAll',
};

export const companyFields: INodeProperties[] = [
	// Company ID field for operations that require it
	{
		displayName: 'Company ID',
		name: 'companyId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['company'],
				operation: ['get', 'update', 'delete'],
			},
		},
		description: 'ID of the company',
	},
	// Name field for create and update operations
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['company'],
				operation: ['create'],
			},
		},
		description: 'Company name',
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['company'],
				operation: ['update'],
			},
		},
		description: 'Company name (leave empty to keep current value)',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['company'],
				operation: ['create', 'update'],
			},
		},
		options: [
			{
				displayName: 'Website',
				name: 'website',
				type: 'string',
				default: '',
				description: 'Company website URL',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'Company description',
			},
			{
				displayName: 'Industry ID',
				name: 'industry_id',
				type: 'string',
				default: '',
				description: 'Industry category ID',
			},
			{
				displayName: 'Size ID',
				name: 'size_id',
				type: 'string',
				default: '',
				description: 'Company size category ID',
			},
			{
				displayName: 'Status ID',
				name: 'status_id',
				type: 'string',
				default: '',
				description: 'Company status ID',
			},
			{
				displayName: 'Source ID',
				name: 'source_id',
				type: 'string',
				default: '',
				description: 'Company source ID',
			},
			{
				displayName: 'Owner ID',
				name: 'owner_id',
				type: 'string',
				default: '',
				description: 'ID of the user who owns this company',
			},
		],
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		description: 'Maximum number of companies to return',
		displayOptions: {
			show: {
				resource: ['company'],
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
				resource: ['company'],
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
				resource: ['company'],
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
				resource: ['company'],
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
