/**
 * Quick script to trigger test posts from 10 diverse bots.
 * Run from project root: cd apps/web && npx tsx scripts/trigger-test-posts.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load env from apps/web/.env.local
config({ path: resolve(__dirname, '../.env.local') });

async function main() {
  // Dynamic import after env is loaded
  const { postBotTake } = await import('../lib/admin/bots/engine');

  const bots = [
    { id: '6a4cb8ee-372e-4679-9782-db7c24f4261d', name: 'maryiderie46', type: 'homer' },
    { id: 'f515552c-1f0a-41d4-8923-7b087b345847', name: 'mary_miners89', type: 'homer' },
    { id: 'edb6f753-94a9-41d1-be33-3c731c6e3379', name: 'chris_aub2', type: 'analyst' },
    { id: '0ac230c8-1776-4774-8ae5-b7051a542ccd', name: 'thel_amy94', type: 'analyst' },
    { id: '4986ea99-c602-48b2-8702-15f9de0e0ad3', name: 'nittanylions_amy27', type: 'hot_take' },
    { id: '31ab8be0-86d7-4d99-b69f-d01f6be2af8e', name: 'lisa43_cin', type: 'hot_take' },
    { id: 'bf59762f-2864-4351-8ae4-a1e759218a5c', name: 'megan_trojans47', type: 'old_school' },
    { id: '5892aebe-1e00-426a-9ee8-88e1d6ba02f6', name: 'colt22_nebw', type: 'old_school' },
    { id: '95a6436c-818a-4d52-83bf-8ac2883a32d7', name: 'big62_uncp', type: 'recruiting' },
    { id: '7bdd0bb5-e44c-41b4-a2f3-f6f24b28aafe', name: 'travis_lnwd52', type: 'recruiting' },
  ];

  for (const bot of bots) {
    console.log(`\n--- ${bot.name} (${bot.type}) ---`);
    try {
      const result = await postBotTake(bot.id);
      if (result.postId) {
        console.log(`  POST ID: ${result.postId}`);
      }
      if (result.error) {
        console.log(`  ERROR: ${result.error}`);
      }
    } catch (e: unknown) {
      console.log(`  EXCEPTION: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  console.log('\nDone! Check the feed for new posts.');
}

main().catch(console.error);
