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
			name: 'Get',
			value: 'get',
			action: 'Get a lead',
			description: 'Get a single lead by ID',
		},
		{
			name: 'Create',
			value: 'create',
			action: 'Create a lead',
			description: 'Create a new lead',
		},
		{
			name: 'Update',
			value: 'update',
			action: 'Update a lead',
			description: 'Update an existing lead',
		},
		{
			name: 'Delete',
			value: 'delete',
			action: 'Delete a lead',
			description: 'Delete a lead by ID',
		},
		{
			name: 'Create Multiple',
			value: 'createMultiple',
			action: 'Create multiple leads',
			description: 'Create multiple leads in bulk',
		},
		{
			name: 'Delete Multiple',
			value: 'deleteMultiple',
			action: 'Delete multiple leads',
			description: 'Delete multiple leads by IDs',
		},
		{
			name: 'Get Call Logs',
			value: 'getCallLogs',
			action: 'Get lead call logs',
			description: 'Get call logs for a specific lead',
		},
		{
			name: 'Assign New Contact',
			value: 'assignNewContact',
			action: 'Assign new contact to lead',
			description: 'Create and assign a new contact to a lead',
		},
		{
			name: 'Assign Contacts',
			value: 'assignContacts',
			action: 'Assign contacts to lead',
			description: 'Assign existing contacts to a lead',
		},
		{
			name: 'Remove Contact',
			value: 'removeContact',
			action: 'Remove contact from lead',
			description: 'Remove a contact from a lead',
		},
		{
			name: 'Import',
			value: 'import',
			action: 'Import leads',
			description: 'Import leads from CSV/Excel file',
		},
		{
			name: 'Get Import Template',
			value: 'getImportTemplate',
			action: 'Get import template',
			description: 'Download import template for leads',
		},
		{
			name: 'Geocode',
			value: 'geocode',
			action: 'Geocode lead address',
			description: 'Manually geocode a lead address',
		},
		{
			name: 'Search Nearby',
			value: 'searchNearby',
			action: 'Find leads near location',
			description: 'Find leads near a specific location',
		},
	],
	default: 'getAll',
};

export const leadFields: INodeProperties[] = [
	// Lead ID field for operations that require it
	{
		displayName: 'Lead ID',
		name: 'leadId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['lead'],
				operation: ['get', 'update', 'delete', 'getCallLogs', 'assignNewContact', 'assignContacts', 'removeContact', 'geocode'],
			},
		},
		description: 'ID of the lead',
	},
	// Contact ID field for remove contact operation
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['lead'],
				operation: ['removeContact'],
			},
		},
		description: 'ID of the contact to remove from the lead',
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
				resource: ['lead'],
				operation: ['create'],
			},
		},
		description: 'Lead name',
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['lead'],
				operation: ['update'],
			},
		},
		description: 'Lead name (leave empty to keep current value)',
	},
	// Lead IDs for bulk operations
	{
		displayName: 'Lead IDs',
		name: 'leadIds',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['lead'],
				operation: ['deleteMultiple'],
			},
		},
		description: 'Comma-separated list of lead IDs to delete',
	},
	// Contact IDs for assign contacts operation
	{
		displayName: 'Contact IDs',
		name: 'contactIds',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['lead'],
				operation: ['assignContacts'],
			},
		},
		description: 'Comma-separated list of contact IDs to assign to the lead',
	},
	// Leads data for bulk create
	{
		displayName: 'Leads Data',
		name: 'leadsData',
		type: 'json',
		default: '[]',
		required: true,
		displayOptions: {
			show: {
				resource: ['lead'],
				operation: ['createMultiple'],
			},
		},
		description: 'Array of lead objects to create',
	},
	// Location fields for search nearby
	{
		displayName: 'Latitude',
		name: 'latitude',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: {
			show: {
				resource: ['lead'],
				operation: ['searchNearby'],
			},
		},
		description: 'Latitude for nearby search',
	},
	{
		displayName: 'Longitude',
		name: 'longitude',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: {
			show: {
				resource: ['lead'],
				operation: ['searchNearby'],
			},
		},
		description: 'Longitude for nearby search',
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
				operation: ['create', 'update'],
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
	// Additional fields for specialized operations
	{
		displayName: 'New Contact Data',
		name: 'newContactData',
		type: 'collection',
		placeholder: 'Add Contact Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['lead'],
				operation: ['assignNewContact'],
			},
		},
		options: [
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				required: true,
				description: 'Contact name',
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				default: '',
				required: true,
				description: 'Contact email',
			},
			{
				displayName: 'Phone Number',
				name: 'phone_number',
				type: 'string',
				default: '',
				description: 'Contact phone number',
			},
		],
	},
	{
		displayName: 'Geocode Data',
		name: 'geocodeData',
		type: 'collection',
		placeholder: 'Add Geocode Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['lead'],
				operation: ['geocode'],
			},
		},
		options: [
			{
				displayName: 'Address',
				name: 'address',
				type: 'string',
				default: '',
				description: 'Address to geocode',
			},
			{
				displayName: 'Latitude',
				name: 'latitude',
				type: 'number',
				default: 0,
				description: 'Latitude coordinate',
			},
			{
				displayName: 'Longitude',
				name: 'longitude',
				type: 'number',
				default: 0,
				description: 'Longitude coordinate',
			},
		],
	},
	{
		displayName: 'Import Data',
		name: 'importData',
		type: 'collection',
		placeholder: 'Add Import Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['lead'],
				operation: ['import'],
			},
		},
		options: [
			{
				displayName: 'File Path/URL',
				name: 'file',
				type: 'string',
				default: '',
				description: 'Path or URL to the import file (CSV/Excel)',
			},
			{
				displayName: 'Field Mapping (JSON)',
				name: 'mapping',
				type: 'json',
				default: '{}',
				description: 'JSON object mapping CSV columns to lead fields',
			},
		],
	},
	{
		displayName: 'Search Options',
		name: 'searchOptions',
		type: 'collection',
		placeholder: 'Add Search Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['lead'],
				operation: ['searchNearby'],
			},
		},
		options: [
			{
				displayName: 'Radius',
				name: 'radius',
				type: 'number',
				default: 10,
				description: 'Search radius',
			},
			{
				displayName: 'Unit',
				name: 'unit',
				type: 'options',
				default: 'km',
				options: [
					{
						name: 'Kilometers',
						value: 'km',
					},
					{
						name: 'Miles',
						value: 'miles',
					},
				],
				description: 'Distance unit',
			},
		],
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		description: 'Maximum number of records to return',
		displayOptions: {
			show: {
				resource: ['lead'],
				operation: ['getAll', 'getCallLogs', 'searchNearby'],
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
				operation: ['getAll', 'getCallLogs', 'searchNearby'],
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