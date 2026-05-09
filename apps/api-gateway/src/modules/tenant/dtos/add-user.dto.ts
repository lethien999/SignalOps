import { IsEmail, IsString, IsOptional } from 'class-validator';

export class AddUserToTenantDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  roleId?: string;
}
