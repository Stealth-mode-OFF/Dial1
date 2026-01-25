#!/usr/bin/env node

/**
 * Seed Supabase database with test data
 * Usage: node scripts/seed-database.mjs
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  console.error('   Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...\n');

    // Create campaigns
    console.log('📊 Creating campaigns...');
    const { data: campaigns, error: campaignsError } = await supabase
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

    if (campaignsError) {
      console.error('Error creating campaigns:', campaignsError);
    } else {
      console.log(`✅ Created ${campaigns.length} campaigns`);
    }

    const campaignId = campaigns?.[0]?.id;

    // Create contacts
    console.log('\n📇 Creating contacts...');
    const { data: contacts, error: contactsError } = await supabase
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
          ai_summary: 'Marta řídí operace. Byl by zajímavá pro integraci s jejich ERP systém.'
        }
      ])
      .select();

    if (contactsError) {
      console.error('Error creating contacts:', contactsError);
    } else {
      console.log(`✅ Created ${contacts.length} contacts`);
    }

    // Create sample deals
    console.log('\n💰 Creating deals...');
    const { data: deals, error: dealsError } = await supabase
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

    if (dealsError) {
      console.error('Error creating deals:', dealsError);
    } else {
      console.log(`✅ Created ${deals.length} deals`);
    }

    console.log('\n✨ Database seeding completed successfully!');
    console.log('\nTest data is ready. You can now:');
    console.log('1. Open http://localhost:3000');
    console.log('2. Navigate to Live Campaigns to see queued contacts');
    console.log('3. Use Command Center to view pipeline and stats');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seedDatabase();
