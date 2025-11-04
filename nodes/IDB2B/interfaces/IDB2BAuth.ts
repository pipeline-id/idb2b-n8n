export interface IDB2BLoginResponse {
	data: {
		session: {
			access_token: string;
			refresh_token?: string;
			expires_at?: string;
		};
		user: {
			id: string;
			email: string;
			name?: string;
		};
	};
}

export interface TokenCache {
	encrypted_token: string;
	iv: string;
	expires_at: Date;
	baseUrl: string;
	credentials_hash: string;
}