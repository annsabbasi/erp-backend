import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Infrastructure
import { PrismaModule } from './modules/prisma/prisma.module';
import { SupabaseModule } from './modules/supabase/supabase.module';

// Core / Auth
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';

// Multi-tenant management
import { CompaniesModule } from './modules/companies/companies.module';
import { SystemModulesModule } from './modules/system-modules/system-modules.module';
import { RolesModule } from './modules/roles/roles.module';

// Domain modules
import { EmployeesModule } from './modules/employees/employees.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { ProductsModule } from './modules/products/products.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { OrdersModule } from './modules/orders/orders.module';
import { InvoicesModule } from './modules/invoices/invoices.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),

    // Infrastructure (global — available everywhere)
    PrismaModule,
    SupabaseModule,

    // Auth & Users
    AuthModule,
    UsersModule,

    // Multi-tenant core
    CompaniesModule,
    SystemModulesModule,
    RolesModule,

    // Domain
    EmployeesModule,
    DepartmentsModule,
    ProductsModule,
    InventoryModule,
    OrdersModule,
    InvoicesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
