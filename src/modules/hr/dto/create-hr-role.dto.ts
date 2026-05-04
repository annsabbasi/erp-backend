import { IsString, IsOptional, IsArray, IsBoolean } from 'class-validator';

export class CreateHrRoleDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  // Must be permission IDs belonging to HR-domain modules only.
  // The service validates this before persisting.
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  permissionIds?: string[];
}
