import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { PermissionScope } from '@prisma/client';

export class RolePermissionAssignmentDto {
  @IsString()
  permissionKey: string;

  @IsEnum(PermissionScope)
  @IsOptional()
  scope?: PermissionScope;
}

export class CreateRoleDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  domain?: string;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @IsEnum(PermissionScope)
  @IsOptional()
  defaultScope?: PermissionScope;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RolePermissionAssignmentDto)
  @ArrayUnique((p: RolePermissionAssignmentDto) => `${p.permissionKey}:${p.scope ?? 'ALL'}`)
  @IsOptional()
  permissions?: RolePermissionAssignmentDto[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  permissionSetIds?: string[];
}

export class UpdateRoleDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  domain?: string;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @IsEnum(PermissionScope)
  @IsOptional()
  defaultScope?: PermissionScope;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RolePermissionAssignmentDto)
  @IsOptional()
  permissions?: RolePermissionAssignmentDto[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  permissionSetIds?: string[];
}

export class CloneRoleDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;
}
