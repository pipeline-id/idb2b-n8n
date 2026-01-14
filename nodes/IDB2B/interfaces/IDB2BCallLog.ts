export interface IDB2BCallLog {
	id?: string;
	lead_id?: string;
	contact_id?: string;
	user_id?: string;
	type?: 'incoming' | 'outgoing' | 'missed';
	duration?: number;
	notes?: string;
	recording_url?: string;
	call_date?: string;
	created_at?: string;
	updated_at?: string;
}