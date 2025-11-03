import {
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class IDB2BApi implements ICredentialType {
	name = 'idb2bApi';
	displayName = 'IDB2B CRM';
	documentationUrl = 'https://docs.idb2b.com';
	properties: INodeProperties[] = [
		{
			displayName: 'Email',
			name: 'email',
			type: 'string',
			default: '',
			required: true,
			placeholder: 'your@email.com',
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://api.idb2b.com',
			required: true,
			description: 'The IDB2B API base URL. Use https://api-stage.idb2b.com for staging environment.',
		},
	];

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/login',
			method: 'POST',
			body: {
				email: '={{$credentials.email}}',
				password: '={{$credentials.password}}',
			},
		},
	};
}
