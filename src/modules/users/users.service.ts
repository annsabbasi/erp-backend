import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Role } from '../../common/decorators/roles.decorator';

export interface UserRecord {
  id: number;
  name: string;
  email: string;
  password: string;
  role: Role;
  modules: string[];
}

@Injectable()
export class UsersService {
  private users: UserRecord[] = [
    {
      id: 1,
      name: 'Super Admin',
      email: 'admin@erp.com',
      password: 'admin',
      role: Role.SUPER_ADMIN,
      modules: [], // super admin has access to everything, this field is ignored
    },
    {
      id: 2,
      name: 'Standard User',
      email: 'user@erp.com',
      password: 'user1',
      role: Role.USER,
      modules: ['Financials', 'CRM'],
    },
  ];

  findAll(): Omit<UserRecord, 'password'>[] {
    return this.users.map(({ password, ...rest }) => rest);
  }

  findOne(id: number): Omit<UserRecord, 'password'> {
    const user = this.users.find((u) => u.id === id);
    if (!user) throw new NotFoundException(`User #${id} not found`);
    const { password, ...rest } = user;
    return rest;
  }

  findByEmail(email: string): UserRecord | undefined {
    return this.users.find((u) => u.email === email);
  }

  create(createUserDto: CreateUserDto): Omit<UserRecord, 'password'> {
    const user: UserRecord = {
      id: Date.now(),
      name: createUserDto.name,
      email: createUserDto.email,
      password: createUserDto.password,
      role: createUserDto.role || Role.USER,
      modules: createUserDto.modules || [],
    };
    this.users.push(user);
    const { password, ...rest } = user;
    return rest;
  }

  update(id: number, updateUserDto: UpdateUserDto): Omit<UserRecord, 'password'> {
    const index = this.users.findIndex((u) => u.id === id);
    if (index === -1) throw new NotFoundException(`User #${id} not found`);
    this.users[index] = { ...this.users[index], ...updateUserDto };
    const { password, ...rest } = this.users[index];
    return rest;
  }

  remove(id: number) {
    const index = this.users.findIndex((u) => u.id === id);
    if (index === -1) throw new NotFoundException(`User #${id} not found`);
    this.users.splice(index, 1);
    return { message: `User #${id} removed` };
  }
}
