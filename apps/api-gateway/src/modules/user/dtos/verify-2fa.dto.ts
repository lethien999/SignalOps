import { IsString, Length } from 'class-validator';

export class Verify2FaDto {
  @IsString()
  @Length(6, 6)
  code: string; // 6-digit OTP code
}

export class Enable2FaDto {
  @IsString()
  @Length(6, 6)
  code: string; // 6-digit OTP code to verify setup
}

export class Disable2FaDto {
  @IsString()
  password: string; // Password confirmation to disable 2FA
}
