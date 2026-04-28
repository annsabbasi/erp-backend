import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

@Injectable()
export class EmployeesService {
  private employees: any[] = [];

  findAll() {
    return this.employees;
  }

  findOne(id: number) {
    const employee = this.employees.find((e) => e.id === id);
    if (!employee) throw new NotFoundException(`Employee #${id} not found`);
    return employee;
  }

  create(createEmployeeDto: CreateEmployeeDto) {
    const employee = { id: Date.now(), ...createEmployeeDto };
    this.employees.push(employee);
    return employee;
  }

  update(id: number, updateEmployeeDto: UpdateEmployeeDto) {
    const index = this.employees.findIndex((e) => e.id === id);
    if (index === -1) throw new NotFoundException(`Employee #${id} not found`);
    this.employees[index] = { ...this.employees[index], ...updateEmployeeDto };
    return this.employees[index];
  }

  remove(id: number) {
    const index = this.employees.findIndex((e) => e.id === id);
    if (index === -1) throw new NotFoundException(`Employee #${id} not found`);
    this.employees.splice(index, 1);
    return { message: `Employee #${id} removed` };
  }
}
