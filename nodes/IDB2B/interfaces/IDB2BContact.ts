export interface IDB2BContact {
	id: string;
	organization_id: string;
	name: string;
	phone_number?: string;
	email?: string;
	user_id: string;
	lead_id?: string;
	created_at: string;
	updated_at: string;
	lead?: any;
	favorites: boolean;
	tags: Array<{
		id: string;
		organization_id: string;
		name: string;
	}>;
}