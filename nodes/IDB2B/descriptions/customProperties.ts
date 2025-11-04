import { INodeProperties } from 'n8n-workflow';

export const customOperations: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	displayOptions: {
		show: {
			resource: ['custom'],
		},
	},
	options: [
		{
			name: 'GET Request',
			value: 'get',
			action: 'Execute a GET request',
			routing: {
				request: {
					method: 'GET',
				},
			},
		},
		{
			name: 'POST Request',
			value: 'post',
			action: 'Execute a POST request',
			routing: {
				request: {
					method: 'POST',
				},
			},
		},
		{
			name: 'PUT Request',
			value: 'put',
			action: 'Execute a PUT request',
			routing: {
				request: {
					method: 'PUT',
				},
			},
		},
		{
			name: 'DELETE Request',
			value: 'delete',
			action: 'Execute a DELETE request',
			routing: {
				request: {
					method: 'DELETE',
				},
			},
		},
	],
	default: 'get',
};