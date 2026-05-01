import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getStatus() {
    return {
      success: true,
      message: 'ERP Backend API is running',
      version: '1.0.0',
      status: 'healthy',
      environment: process.env.NODE_ENV || 'development',
      endpoints: {
        auth: '/api/v1/auth',
        users: '/api/v1/users',
        employees: '/api/v1/employees',
        departments: '/api/v1/departments',
        products: '/api/v1/products',
        inventory: '/api/v1/inventory',
        orders: '/api/v1/orders',
        invoices: '/api/v1/invoices',
      },
    };
  }
}
