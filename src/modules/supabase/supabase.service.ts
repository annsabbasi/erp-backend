import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService implements OnModuleInit {
  private readonly logger = new Logger(SupabaseService.name);
  private client: SupabaseClient;
  private adminClient: SupabaseClient;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const url = this.configService.get<string>('supabase.url');
    const anonKey = this.configService.get<string>('supabase.anonKey');
    const serviceRoleKey = this.configService.get<string>('supabase.serviceRoleKey');

    if (!url || !anonKey) {
      throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be set in environment variables');
    }

    this.client = createClient(url, anonKey);

    // Admin client bypasses Row Level Security — use only for server-side operations
    if (serviceRoleKey) {
      this.adminClient = createClient(url, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
    }

    this.logger.log('Supabase client initialized');
  }

  /** Public (anon) client — respects Row Level Security */
  getClient(): SupabaseClient {
    return this.client;
  }

  /** Service-role client — bypasses RLS, use only for trusted server operations */
  getAdminClient(): SupabaseClient {
    if (!this.adminClient) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set — admin client unavailable');
    }
    return this.adminClient;
  }
}
