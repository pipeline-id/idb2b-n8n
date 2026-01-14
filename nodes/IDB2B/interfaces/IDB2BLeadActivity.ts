export interface IDB2BLeadActivity {
	id?: string;
	lead_id?: string;
	icon?: string;
	subject: string;
	description?: string;
	datetime?: string;
	user_id?: string;
	attachments?: string[];
	attachments_to_delete?: string[];
	created_at?: string;
	updated_at?: string;
}