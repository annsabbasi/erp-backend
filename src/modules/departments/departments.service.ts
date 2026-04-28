import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@Injectable()
export class DepartmentsService {
  private departments: any[] = [];

  findAll() {
    return this.departments;
  }

  findOne(id: number) {
    const dept = this.departments.find((d) => d.id === id);
    if (!dept) throw new NotFoundException(`Department #${id} not found`);
    return dept;
  }

  create(createDepartmentDto: CreateDepartmentDto) {
    const dept = { id: Date.now(), ...createDepartmentDto };
    this.departments.push(dept);
    return dept;
  }

  update(id: number, updateDepartmentDto: UpdateDepartmentDto) {
    const index = this.departments.findIndex((d) => d.id === id);
    if (index === -1) throw new NotFoundException(`Department #${id} not found`);
    this.departments[index] = { ...this.departments[index], ...updateDepartmentDto };
    return this.departments[index];
  }

  remove(id: number) {
    const index = this.departments.findIndex((d) => d.id === id);
    if (index === -1) throw new NotFoundException(`Department #${id} not found`);
    this.departments.splice(index, 1);
    return { message: `Department #${id} removed` };
  }
}
