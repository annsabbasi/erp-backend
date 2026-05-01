import { IsString, IsOptional, IsBoolean, IsArray } from 'class-validator';

export class CreateRoleDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  // Permission IDs to assign to this role
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  permissionIds?: string[];
}
