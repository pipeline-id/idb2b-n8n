export interface IDB2BLoginResponse {
	data: {
		access_token: string;
		token_type: string;
		expires_in: number;
		expires_at: number;
		refresh_token: string;
		user: {
			id: string;
			email: string;
			email_confirmed_at?: string;
			phone?: string;
			confirmed_at?: string;
			last_sign_in_at?: string;
			app_metadata?: {
				provider: string;
				providers: string[];
			};
			user_metadata?: {
				avatar_url?: string;
				email: string;
				email_verified?: boolean;
				full_name?: string;
				iss?: string;
				name?: string;
				organization_id?: string;
				phone_verified?: boolean;
				picture?: string;
				provider_id?: string;
				sub?: string;
			};
			identities?: Array<{
				identity_id: string;
				id: string;
				user_id: string;
				identity_data: any;
				provider: string;
				last_sign_in_at: string;
				created_at: string;
				updated_at: string;
				email: string;
			}>;
			created_at?: string;
			updated_at?: string;
			is_anonymous?: boolean;
		};
		weak_password?: any;
	};
}

export interface TokenCache {
	encrypted_token: string;
	iv: string;
	expires_at: Date;
	baseUrl: string;
	credentials_hash: string;
}