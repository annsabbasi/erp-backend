import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { PermissionScope } from '@prisma/client';

export class PermissionSetItemDto {
  @IsString()
  permissionKey: string;

  @IsEnum(PermissionScope)
  @IsOptional()
  scope?: PermissionScope;
}

export class CreatePermissionSetDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PermissionSetItemDto)
  @IsOptional()
  items?: PermissionSetItemDto[];
}

export class UpdatePermissionSetDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export class ReplaceItemsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PermissionSetItemDto)
  @ArrayUnique((item: PermissionSetItemDto) => `${item.permissionKey}:${item.scope ?? 'ALL'}`)
  items: PermissionSetItemDto[];
}
