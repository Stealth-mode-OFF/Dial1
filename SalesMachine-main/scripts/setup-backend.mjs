#!/usr/bin/env node

/**
 * Comprehensive backend setup and data seeding
 * Usage: node scripts/setup-backend.mjs
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  console.error('   Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  try {
    console.log('🔧 Setting up Supabase backend...\n');

    // Check Supabase connection
    console.log('📡 Checking Supabase connection...');
    const { data: tables, error: connectionError } = await supabase
      .from('campaigns')
      .select('*', { count: 'exact', head: true });

    if (connectionError) {
      console.log('⚠️  Tables may need to be created. Follow these steps:');
      console.log('\n1. Go to your Supabase project dashboard');
      console.log('2. Navigate to the SQL Editor');
      console.log('3. Create a new query and paste the migration SQL:');
      console.log(`   File: supabase/migrations/20260116_create_core_tables.sql\n`);
      
      // Try to read and suggest the migration content
      try {
        const migrationPath = path.join(__dirname, '../supabase/migrations/20260116_create_core_tables.sql');
        const migrationSql = fs.readFileSync(migrationPath, 'utf-8');
        console.log('Migration SQL Content (first 500 chars):');
        console.log(migrationSql.substring(0, 500));
        console.log('...\n');
      } catch (e) {
        // Ignore if file not found
      }

      console.log('4. Execute the SQL');
      console.log('5. After creating tables, run this script again\n');
      return;
    }

    console.log('✅ Supabase connected successfully\n');

    // Seed data
    console.log('🌱 Seeding test data...\n');

    // Create campaigns
    console.log('📊 Creating campaigns...');
    const { data: campaigns } = await supabase
      .from('campaigns')
      .insert([
        {
          name: 'Q1 2026 - Tech Sales Push',
          description: 'Cold outreach to tech companies in CEE region',
          status: 'active',
          contacts_count: 0,
          calls_made: 0,
          meetings_booked: 0
        },
        {
          name: 'Enterprise Expansion',
          description: 'Outreach to enterprise decision makers',
          status: 'active',
          contacts_count: 0,
          calls_made: 0,
          meetings_booked: 0
        }
      ])
      .select();

    console.log(`✅ Created ${campaigns?.length || 0} campaigns`);

    const campaignId = campaigns?.[0]?.id;
    if (!campaignId) {
      console.error('❌ Failed to create campaigns');
      return;
    }

    // Create contacts
    console.log('\n📇 Creating contacts...');
    const { data: contacts } = await supabase
      .from('contacts')
      .insert([
        {
          campaign_id: campaignId,
          name: 'Martin Novák',
          role: 'CTO',
          company: 'TechCorp s.r.o.',
          phone: '+420 777 123 456',
          email: 'martin.novak@techcorp.cz',
          status: 'queued',
          source: 'LinkedIn Outreach',
          last_touch: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          ai_summary: 'Společnost TechCorp včera oznámila expanzi do regionu CEE. Martin pravděpodobně hledá nástroje pro škálování sales týmu.'
        },
        {
          campaign_id: campaignId,
          name: 'Jana Svobodová',
          role: 'VP Sales',
          company: 'Innovate Digital',
          phone: '+420 775 234 567',
          email: 'jana.svobodova@innovate.cz',
          status: 'queued',
          source: 'Cold Call List',
          last_touch: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
          ai_summary: 'Jana vede sales tým ze 12 lidí. Poslední měsíc zvýšili targeting na mid-market účty.'
        },
        {
          campaign_id: campaignId,
          name: 'Petr Mrázek',
          role: 'Sales Manager',
          company: 'Cloudtech Solutions',
          phone: '+420 776 345 678',
          email: 'petr.mrazek@cloudtech.cz',
          status: 'queued',
          source: 'Referral',
          last_touch: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          ai_summary: 'Petr má zkušenost s multiple sales tools. Je otevřený nově rozhodnutí o stack řešení.'
        },
        {
          campaign_id: campaignId,
          name: 'Marta Králíková',
          role: 'Head of Operations',
          company: 'Enterprise Systems AG',
          phone: '+420 774 456 789',
          email: 'marta.kralikova@entsys.cz',
          status: 'queued',
          source: 'LinkedIn Outreach',
          last_touch: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
          ai_summary: 'Marta řídí operace. Byla by zajímavá pro integraci s jejich ERP systém.'
        }
      ])
      .select();

    console.log(`✅ Created ${contacts?.length || 0} contacts`);

    // Create deals
    console.log('\n💰 Creating deals...');
    const { data: deals } = await supabase
      .from('deals')
      .insert([
        {
          campaign_id: campaignId,
          contact_id: contacts?.[0]?.id,
          name: 'TechCorp - Dialer Implementation',
          value: 50000,
          currency: 'EUR',
          status: 'open',
          expected_close_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          campaign_id: campaignId,
          contact_id: contacts?.[1]?.id,
          name: 'Innovate Digital - Sales Automation',
          value: 75000,
          currency: 'EUR',
          status: 'open',
          expected_close_date: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString()
        }
      ])
      .select();

    console.log(`✅ Created ${deals?.length || 0} deals`);

    console.log('\n✨ Backend setup completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   - Campaigns: ${campaigns?.length || 0}`);
    console.log(`   - Contacts: ${contacts?.length || 0}`);
    console.log(`   - Deals: ${deals?.length || 0}`);
    console.log('\n🚀 Your application is ready to use!');
    console.log('   Visit: http://localhost:3000');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

runMigration();
