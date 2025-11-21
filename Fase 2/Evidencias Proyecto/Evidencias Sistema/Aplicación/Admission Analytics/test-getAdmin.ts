// test-getAdmin.ts
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const { data, error } = await supabase
  .from('user_profiles')
  .select('user_id')
  .limit(1);

if (error) console.error('❌ Error:', error);
else console.log('✅ Resultado:', data);
