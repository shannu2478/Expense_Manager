import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yksnbxghpldijcqwyjvq.supabase.co';
const supabaseAnonKey = 'sb_publishable_Z-x_l7u6uXQYrTZAmJwpGg_WO80jfrh';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});