import { INodeProperties } from 'n8n-workflow';

export const resourceProperty: INodeProperties = {
	displayName: 'Resource',
	name: 'resource',
	type: 'options',
	noDataExpression: true,
	options: [
		{
			name: 'Contact',
			value: 'contact',
		},
		{
			name: 'Lead',
			value: 'lead',
		},
		{
			name: 'Custom',
			value: 'custom',
		},
	],
	default: 'contact',
};

export const customEndpointProperty: INodeProperties = {
	displayName: 'Endpoint',
	name: 'endpoint',
	type: 'string',
	default: '/api/v1/',
	placeholder: '/api/v1/resource',
	description: 'The endpoint to call',
	displayOptions: {
		show: {
			resource: ['custom'],
		},
	},
	routing: {
		request: {
			url: '={{$value}}',
		},
	},
};

export const customJsonBodyProperty: INodeProperties = {
	displayName: 'JSON Body',
	name: 'jsonBody',
	type: 'json',
	default: '{}',
	description: 'JSON body for POST/PUT requests',
	displayOptions: {
		show: {
			operation: ['post', 'put'],
			resource: ['custom'],
		},
	},
	routing: {
		request: {
			body: '={{JSON.parse($value)}}',
		},
	},
};

export const customQueryParametersProperty: INodeProperties = {
	displayName: 'Query Parameters',
	name: 'queryParameters',
	type: 'fixedCollection',
	typeOptions: {
		multipleValues: true,
	},
	default: {},
	placeholder: 'Add Parameter',
	displayOptions: {
		show: {
			resource: ['custom'],
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
};