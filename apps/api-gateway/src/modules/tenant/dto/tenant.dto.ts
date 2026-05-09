export class CreateTenantDto {
  name: string;
  eventsPerMonth?: number;
  alertsPerMonth?: number;
  description?: string;
}

export class UpdateTenantDto {
  name?: string;
  eventsPerMonth?: number;
  alertsPerMonth?: number;
  status?: 'active' | 'suspended' | 'deleted';
  description?: string;
}
