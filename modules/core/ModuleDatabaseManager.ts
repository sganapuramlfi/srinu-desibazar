import { ModuleRegistry } from './ModuleRegistry.js';
import { IndustryType } from './types.js';

export interface DatabaseSchema {
  moduleId: string;
  version: string;
  tables: Array<{
    name: string;
    schema: string;
    indexes?: string[];
    constraints?: string[];
  }>;
  dependencies: string[];
}

export interface MigrationStatus {
  moduleId: string;
  version: string;
  appliedAt: Date;
  status: 'pending' | 'applied' | 'failed' | 'rolled_back';
  error?: string;
}

export class ModuleDatabaseManager {
  private moduleRegistry: ModuleRegistry;

  constructor() {
    this.moduleRegistry = ModuleRegistry.getInstance();
  }

  // Apply migrations only for enabled modules
  async applyModuleMigrations(): Promise<{
    success: boolean;
    appliedMigrations: MigrationStatus[];
    errors: string[];
  }> {
    const enabledModules = this.moduleRegistry.getEnabledModules();
    const appliedMigrations: MigrationStatus[] = [];
    const errors: string[] = [];

    console.log(`🗄️ Applying database migrations for ${enabledModules.length} enabled modules...`);

    for (const module of enabledModules) {
      try {
        const schema = await this.getModuleSchema(module.config.id);
        const migrationStatus = await this.applyModuleSchema(schema);
        appliedMigrations.push(migrationStatus);
        
        console.log(`✅ Applied migrations for module: ${module.config.id}`);
      } catch (error) {
        const errorMessage = `Failed to apply migrations for module ${module.config.id}: ${error}`;
        errors.push(errorMessage);
        console.error(`❌ ${errorMessage}`);
        
        appliedMigrations.push({
          moduleId: module.config.id,
          version: module.config.version,
          appliedAt: new Date(),
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return {
      success: errors.length === 0,
      appliedMigrations,
      errors
    };
  }

  // Remove migrations for disabled modules
  async removeModuleMigrations(moduleId: string): Promise<{
    success: boolean;
    removedTables: string[];
    errors: string[];
  }> {
    const schema = await this.getModuleSchema(moduleId);
    const removedTables: string[] = [];
    const errors: string[] = [];

    console.log(`🗄️ Removing database schema for module: ${moduleId}`);

    try {
      // Check for dependencies before removing
      const dependentModules = await this.checkModuleDependencies(moduleId);
      if (dependentModules.length > 0) {
        throw new Error(`Cannot remove ${moduleId}: Required by ${dependentModules.join(', ')}`);
      }

      // Remove tables in reverse order (to handle foreign key constraints)
      const reversedTables = [...schema.tables].reverse();
      
      for (const table of reversedTables) {
        await this.dropTable(table.name);
        removedTables.push(table.name);
        console.log(`🗑️ Dropped table: ${table.name}`);
      }

      // Update migration status
      await this.updateMigrationStatus(moduleId, 'rolled_back');

    } catch (error) {
      const errorMessage = `Failed to remove schema for module ${moduleId}: ${error}`;
      errors.push(errorMessage);
      console.error(`❌ ${errorMessage}`);
    }

    return {
      success: errors.length === 0,
      removedTables,
      errors
    };
  }

  // Get database schema for specific module
  private async getModuleSchema(moduleId: string): Promise<DatabaseSchema> {
    const moduleSchemas: Record<string, DatabaseSchema> = {
      salon: {
        moduleId: 'salon',
        version: '1.0.0',
        dependencies: [],
        tables: [
          {
            name: 'salon_staff',
            schema: `
              CREATE TABLE IF NOT EXISTS salon_staff (
                id SERIAL PRIMARY KEY,
                business_id INTEGER REFERENCES businesses(id),
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE,
                phone VARCHAR(50),
                role VARCHAR(50) NOT NULL,
                skills TEXT[],
                hourly_rate DECIMAL(10,2),
                commission DECIMAL(5,2),
                working_hours JSONB,
                status VARCHAR(20) DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
              )`,
            indexes: [
              'CREATE INDEX IF NOT EXISTS idx_salon_staff_business_id ON salon_staff(business_id)',
              'CREATE INDEX IF NOT EXISTS idx_salon_staff_status ON salon_staff(status)'
            ]
          },
          {
            name: 'salon_services',
            schema: `
              CREATE TABLE IF NOT EXISTS salon_services (
                id SERIAL PRIMARY KEY,
                business_id INTEGER REFERENCES businesses(id),
                name VARCHAR(255) NOT NULL,
                description TEXT,
                duration INTEGER NOT NULL,
                price DECIMAL(10,2) NOT NULL,
                category VARCHAR(100),
                required_skills TEXT[],
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
              )`,
            indexes: [
              'CREATE INDEX IF NOT EXISTS idx_salon_services_business_id ON salon_services(business_id)',
              'CREATE INDEX IF NOT EXISTS idx_salon_services_category ON salon_services(category)'
            ]
          },
          {
            name: 'salon_bookings',
            schema: `
              CREATE TABLE IF NOT EXISTS salon_bookings (
                id SERIAL PRIMARY KEY,
                business_id INTEGER REFERENCES businesses(id),
                customer_id INTEGER REFERENCES customers(id),
                staff_id INTEGER REFERENCES salon_staff(id),
                service_id INTEGER REFERENCES salon_services(id),
                start_time TIMESTAMP NOT NULL,
                end_time TIMESTAMP NOT NULL,
                status VARCHAR(20) DEFAULT 'confirmed',
                notes TEXT,
                total_amount DECIMAL(10,2),
                deposit_amount DECIMAL(10,2),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
              )`,
            indexes: [
              'CREATE INDEX IF NOT EXISTS idx_salon_bookings_business_id ON salon_bookings(business_id)',
              'CREATE INDEX IF NOT EXISTS idx_salon_bookings_staff_id ON salon_bookings(staff_id)',
              'CREATE INDEX IF NOT EXISTS idx_salon_bookings_start_time ON salon_bookings(start_time)',
              'CREATE INDEX IF NOT EXISTS idx_salon_bookings_status ON salon_bookings(status)'
            ]
          }
        ]
      },
      restaurant: {
        moduleId: 'restaurant',
        version: '1.0.0',
        dependencies: [],
        tables: [
          {
            name: 'restaurant_tables',
            schema: `
              CREATE TABLE IF NOT EXISTS restaurant_tables (
                id SERIAL PRIMARY KEY,
                business_id INTEGER REFERENCES businesses(id),
                table_number VARCHAR(20) NOT NULL,
                seats INTEGER NOT NULL,
                location VARCHAR(50),
                features TEXT[],
                min_party INTEGER DEFAULT 1,
                max_party INTEGER,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
              )`,
            indexes: [
              'CREATE INDEX IF NOT EXISTS idx_restaurant_tables_business_id ON restaurant_tables(business_id)'
            ]
          },
          {
            name: 'restaurant_reservations',
            schema: `
              CREATE TABLE IF NOT EXISTS restaurant_reservations (
                id SERIAL PRIMARY KEY,
                business_id INTEGER REFERENCES businesses(id),
                table_id INTEGER REFERENCES restaurant_tables(id),
                customer_name VARCHAR(255) NOT NULL,
                contact_phone VARCHAR(50) NOT NULL,
                party_size INTEGER NOT NULL,
                start_time TIMESTAMP NOT NULL,
                end_time TIMESTAMP NOT NULL,
                status VARCHAR(20) DEFAULT 'confirmed',
                special_requests TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
              )`,
            indexes: [
              'CREATE INDEX IF NOT EXISTS idx_restaurant_reservations_business_id ON restaurant_reservations(business_id)',
              'CREATE INDEX IF NOT EXISTS idx_restaurant_reservations_start_time ON restaurant_reservations(start_time)'
            ]
          }
        ]
      },
      realestate: {
        moduleId: 'realestate',
        version: '1.0.0',
        dependencies: [],
        tables: [
          {
            name: 'realestate_properties',
            schema: `
              CREATE TABLE IF NOT EXISTS realestate_properties (
                id SERIAL PRIMARY KEY,
                business_id INTEGER REFERENCES businesses(id),
                property_type VARCHAR(50) NOT NULL,
                address JSONB NOT NULL,
                details JSONB,
                price JSONB NOT NULL,
                features TEXT[],
                images TEXT[],
                status VARCHAR(20) DEFAULT 'available',
                listing_agent INTEGER,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
              )`,
            indexes: [
              'CREATE INDEX IF NOT EXISTS idx_realestate_properties_business_id ON realestate_properties(business_id)',
              'CREATE INDEX IF NOT EXISTS idx_realestate_properties_status ON realestate_properties(status)'
            ]
          },
          {
            name: 'realestate_viewings',
            schema: `
              CREATE TABLE IF NOT EXISTS realestate_viewings (
                id SERIAL PRIMARY KEY,
                business_id INTEGER REFERENCES businesses(id),
                property_id INTEGER REFERENCES realestate_properties(id),
                customer_name VARCHAR(255) NOT NULL,
                contact_phone VARCHAR(50) NOT NULL,
                attendee_count INTEGER DEFAULT 1,
                viewing_type VARCHAR(20) NOT NULL,
                start_time TIMESTAMP NOT NULL,
                end_time TIMESTAMP NOT NULL,
                agent_id INTEGER,
                status VARCHAR(20) DEFAULT 'scheduled',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
              )`,
            indexes: [
              'CREATE INDEX IF NOT EXISTS idx_realestate_viewings_business_id ON realestate_viewings(business_id)',
              'CREATE INDEX IF NOT EXISTS idx_realestate_viewings_property_id ON realestate_viewings(property_id)'
            ]
          }
        ]
      },
      eventmanagement: {
        moduleId: 'eventmanagement',
        version: '1.0.0',
        dependencies: [],
        tables: [
          {
            name: 'event_venues',
            schema: `
              CREATE TABLE IF NOT EXISTS event_venues (
                id SERIAL PRIMARY KEY,
                business_id INTEGER REFERENCES businesses(id),
                venue_name VARCHAR(255) NOT NULL,
                capacity JSONB NOT NULL,
                location VARCHAR(50),
                venue_type VARCHAR(50),
                amenities TEXT[],
                setup_options TEXT[],
                price_per_hour DECIMAL(10,2),
                minimum_hours INTEGER DEFAULT 4,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
              )`,
            indexes: [
              'CREATE INDEX IF NOT EXISTS idx_event_venues_business_id ON event_venues(business_id)'
            ]
          },
          {
            name: 'event_bookings',
            schema: `
              CREATE TABLE IF NOT EXISTS event_bookings (
                id SERIAL PRIMARY KEY,
                business_id INTEGER REFERENCES businesses(id),
                venue_id INTEGER REFERENCES event_venues(id),
                event_type VARCHAR(50) NOT NULL,
                event_name VARCHAR(255) NOT NULL,
                guest_count INTEGER NOT NULL,
                start_time TIMESTAMP NOT NULL,
                end_time TIMESTAMP NOT NULL,
                contact_phone VARCHAR(50) NOT NULL,
                status VARCHAR(20) DEFAULT 'pending',
                coordinator_id INTEGER,
                total_amount DECIMAL(10,2),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
              )`,
            indexes: [
              'CREATE INDEX IF NOT EXISTS idx_event_bookings_business_id ON event_bookings(business_id)',
              'CREATE INDEX IF NOT EXISTS idx_event_bookings_venue_id ON event_bookings(venue_id)'
            ]
          }
        ]
      },
      retail: {
        moduleId: 'retail',
        version: '1.0.0',
        dependencies: [],
        tables: [
          {
            name: 'retail_products',
            schema: `
              CREATE TABLE IF NOT EXISTS retail_products (
                id SERIAL PRIMARY KEY,
                business_id INTEGER REFERENCES businesses(id),
                name VARCHAR(255) NOT NULL,
                brand VARCHAR(255),
                category VARCHAR(100),
                price DECIMAL(10,2) NOT NULL,
                sku VARCHAR(100) UNIQUE,
                sizes TEXT[],
                colors TEXT[],
                inventory JSONB,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
              )`,
            indexes: [
              'CREATE INDEX IF NOT EXISTS idx_retail_products_business_id ON retail_products(business_id)',
              'CREATE INDEX IF NOT EXISTS idx_retail_products_category ON retail_products(category)'
            ]
          },
          {
            name: 'retail_appointments',
            schema: `
              CREATE TABLE IF NOT EXISTS retail_appointments (
                id SERIAL PRIMARY KEY,
                business_id INTEGER REFERENCES businesses(id),
                customer_id INTEGER REFERENCES customers(id),
                appointment_type VARCHAR(50) NOT NULL,
                personal_shopper_id INTEGER,
                start_time TIMESTAMP NOT NULL,
                end_time TIMESTAMP NOT NULL,
                contact_phone VARCHAR(50) NOT NULL,
                status VARCHAR(20) DEFAULT 'scheduled',
                budget JSONB,
                preferences TEXT[],
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
              )`,
            indexes: [
              'CREATE INDEX IF NOT EXISTS idx_retail_appointments_business_id ON retail_appointments(business_id)',
              'CREATE INDEX IF NOT EXISTS idx_retail_appointments_start_time ON retail_appointments(start_time)'
            ]
          }
        ]
      },
      professionalservices: {
        moduleId: 'professionalservices',
        version: '1.0.0',
        dependencies: [],
        tables: [
          {
            name: 'professional_consultants',
            schema: `
              CREATE TABLE IF NOT EXISTS professional_consultants (
                id SERIAL PRIMARY KEY,
                business_id INTEGER REFERENCES businesses(id),
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE,
                profession VARCHAR(100) NOT NULL,
                specializations TEXT[],
                hourly_rate DECIMAL(10,2),
                experience INTEGER,
                languages TEXT[],
                status VARCHAR(20) DEFAULT 'active',
                working_hours JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
              )`,
            indexes: [
              'CREATE INDEX IF NOT EXISTS idx_professional_consultants_business_id ON professional_consultants(business_id)'
            ]
          },
          {
            name: 'professional_consultations',
            schema: `
              CREATE TABLE IF NOT EXISTS professional_consultations (
                id SERIAL PRIMARY KEY,
                business_id INTEGER REFERENCES businesses(id),
                consultant_id INTEGER REFERENCES professional_consultants(id),
                client_id INTEGER REFERENCES customers(id),
                consultation_type VARCHAR(50) NOT NULL,
                start_time TIMESTAMP NOT NULL,
                end_time TIMESTAMP NOT NULL,
                consultation_mode VARCHAR(20) NOT NULL,
                status VARCHAR(20) DEFAULT 'scheduled',
                urgency VARCHAR(20) DEFAULT 'standard',
                billing_type VARCHAR(20) DEFAULT 'hourly',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
              )`,
            indexes: [
              'CREATE INDEX IF NOT EXISTS idx_professional_consultations_business_id ON professional_consultations(business_id)',
              'CREATE INDEX IF NOT EXISTS idx_professional_consultations_consultant_id ON professional_consultations(consultant_id)'
            ]
          }
        ]
      },
      ai: {
        moduleId: 'ai',
        version: '1.0.0',
        dependencies: [],
        tables: [
          {
            name: 'ai_requests',
            schema: `
              CREATE TABLE IF NOT EXISTS ai_requests (
                id SERIAL PRIMARY KEY,
                business_id INTEGER REFERENCES businesses(id),
                user_id INTEGER,
                feature VARCHAR(50) NOT NULL,
                prompt TEXT NOT NULL,
                context JSONB,
                metadata JSONB,
                status VARCHAR(20) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
              )`,
            indexes: [
              'CREATE INDEX IF NOT EXISTS idx_ai_requests_business_id ON ai_requests(business_id)',
              'CREATE INDEX IF NOT EXISTS idx_ai_requests_feature ON ai_requests(feature)'
            ]
          },
          {
            name: 'ai_responses',
            schema: `
              CREATE TABLE IF NOT EXISTS ai_responses (
                id SERIAL PRIMARY KEY,
                request_id INTEGER REFERENCES ai_requests(id),
                response TEXT NOT NULL,
                confidence DECIMAL(3,2),
                suggestions JSONB,
                metadata JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
              )`,
            indexes: [
              'CREATE INDEX IF NOT EXISTS idx_ai_responses_request_id ON ai_responses(request_id)'
            ]
          }
        ]
      }
    };

    const schema = moduleSchemas[moduleId];
    if (!schema) {
      throw new Error(`No database schema found for module: ${moduleId}`);
    }

    return schema;
  }

  // Apply schema for specific module
  private async applyModuleSchema(schema: DatabaseSchema): Promise<MigrationStatus> {
    try {
      console.log(`📊 Applying schema for module: ${schema.moduleId}`);

      // Create tables
      for (const table of schema.tables) {
        await this.executeSQL(table.schema);
        console.log(`✅ Created table: ${table.name}`);

        // Create indexes
        if (table.indexes) {
          for (const index of table.indexes) {
            await this.executeSQL(index);
          }
        }

        // Add constraints
        if (table.constraints) {
          for (const constraint of table.constraints) {
            await this.executeSQL(constraint);
          }
        }
      }

      // Record migration status
      await this.recordMigrationStatus(schema.moduleId, schema.version, 'applied');

      return {
        moduleId: schema.moduleId,
        version: schema.version,
        appliedAt: new Date(),
        status: 'applied'
      };
    } catch (error) {
      await this.recordMigrationStatus(schema.moduleId, schema.version, 'failed');
      throw error;
    }
  }

  // Check for module dependencies
  private async checkModuleDependencies(moduleId: string): Promise<string[]> {
    const enabledModules = this.moduleRegistry.getEnabledModules();
    const dependentModules: string[] = [];

    for (const module of enabledModules) {
      if (module.config.dependencies && module.config.dependencies.includes(moduleId)) {
        dependentModules.push(module.config.id);
      }
    }

    return dependentModules;
  }

  // Execute SQL command
  private async executeSQL(sql: string): Promise<void> {
    // This would execute the actual SQL command
    // For now, we'll just log it
    console.log(`🔍 Executing SQL: ${sql.split('\n')[0]}...`);
    
    // Mock successful execution
    await new Promise(resolve => setTimeout(resolve, 10));
  }

  // Drop table
  private async dropTable(tableName: string): Promise<void> {
    const sql = `DROP TABLE IF EXISTS ${tableName} CASCADE`;
    await this.executeSQL(sql);
  }

  // Record migration status
  private async recordMigrationStatus(moduleId: string, version: string, status: string): Promise<void> {
    const sql = `
      INSERT INTO module_migrations (module_id, version, status, applied_at)
      VALUES ('${moduleId}', '${version}', '${status}', CURRENT_TIMESTAMP)
      ON CONFLICT (module_id) DO UPDATE SET
        version = EXCLUDED.version,
        status = EXCLUDED.status,
        applied_at = EXCLUDED.applied_at
    `;
    await this.executeSQL(sql);
  }

  // Update migration status
  private async updateMigrationStatus(moduleId: string, status: string): Promise<void> {
    const sql = `
      UPDATE module_migrations 
      SET status = '${status}', applied_at = CURRENT_TIMESTAMP
      WHERE module_id = '${moduleId}'
    `;
    await this.executeSQL(sql);
  }

  // Get migration status for all modules
  async getMigrationStatus(): Promise<MigrationStatus[]> {
    // Mock migration status data
    const enabledModules = this.moduleRegistry.getEnabledModules();
    
    return enabledModules.map(module => ({
      moduleId: module.config.id,
      version: module.config.version,
      appliedAt: new Date(),
      status: 'applied' as const
    }));
  }

  // Initialize migration tracking table
  async initializeMigrationTracking(): Promise<void> {
    const sql = `
      CREATE TABLE IF NOT EXISTS module_migrations (
        id SERIAL PRIMARY KEY,
        module_id VARCHAR(50) UNIQUE NOT NULL,
        version VARCHAR(20) NOT NULL,
        status VARCHAR(20) NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        error_message TEXT
      )
    `;
    await this.executeSQL(sql);
    console.log('✅ Migration tracking table initialized');
  }

  // Clean up orphaned data when module is disabled
  async cleanupModuleData(moduleId: string): Promise<{
    success: boolean;
    cleanedTables: string[];
    errors: string[];
  }> {
    const schema = await this.getModuleSchema(moduleId);
    const cleanedTables: string[] = [];
    const errors: string[] = [];

    console.log(`🧹 Cleaning up data for module: ${moduleId}`);

    try {
      // Archive data instead of deleting (for potential re-enabling)
      for (const table of schema.tables) {
        const archiveTableName = `${table.name}_archived`;
        
        // Create archive table
        const createArchiveSQL = table.schema.replace(
          `CREATE TABLE IF NOT EXISTS ${table.name}`,
          `CREATE TABLE IF NOT EXISTS ${archiveTableName}`
        );
        await this.executeSQL(createArchiveSQL);

        // Move data to archive
        const moveDataSQL = `
          INSERT INTO ${archiveTableName} 
          SELECT * FROM ${table.name}
        `;
        await this.executeSQL(moveDataSQL);

        // Clear original table
        const clearDataSQL = `DELETE FROM ${table.name}`;
        await this.executeSQL(clearDataSQL);

        cleanedTables.push(table.name);
        console.log(`📦 Archived data from table: ${table.name}`);
      }
    } catch (error) {
      const errorMessage = `Failed to cleanup data for module ${moduleId}: ${error}`;
      errors.push(errorMessage);
      console.error(`❌ ${errorMessage}`);
    }

    return {
      success: errors.length === 0,
      cleanedTables,
      errors
    };
  }
}