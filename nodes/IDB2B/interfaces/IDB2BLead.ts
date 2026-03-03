export interface IDB2BLead {
	id?: string;
	organization_id?: string;
	owner_id?: string;
	name: string;              // Company name (primary)
	website?: string;
	description?: string;
	status_id?: string;        // Sales pipeline status
	source_id?: string;
	size_id?: string;
	industry_id?: string;
	main_contact_id?: string;  // Link to primary contact
	// Removed individual contact fields - use IDB2BContact instead
	// contact_name, contact_email, contact_phone_number moved to IDB2BContact
	created_at?: string;
	updated_at?: string;
}