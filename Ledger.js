import React, { useState, useEffect, useContext } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity, useColorScheme } from 'react-native';
import { supabase } from './lib/supabase';
import { CurrencyContext } from './CurrencyContext'; // NEW IMPORT

const CURRENCIES = ['₹', '$', '€', '£', '¥', 'A$'];

export default function Ledger({ navigation }) {
  const [transactions, setTransactions] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const { currency, changeCurrency } = useContext(CurrencyContext);

  const isDark = useColorScheme() === 'dark';
  const themeBg = isDark ? '#000000' : '#f5f5f5';
  const cardBg = isDark ? '#111111' : '#ffffff';
  const textColor = isDark ? '#ffffff' : '#333333';
  const headerColor = isDark ? '#ffffff' : '#000000';
  const subTextColor = isDark ? '#888888' : '#666666';

  const fetchTransactions = async () => {
    setRefreshing(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('transactions').select('*').eq('user_id', user.id).order('date', { ascending: false }); 
      if (data) setTransactions(data);
    }
    setRefreshing(false);
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => fetchTransactions());
    return unsubscribe;
  }, [navigation]);

  const handleCurrencyCycle = () => {
    const nextIndex = (CURRENCIES.indexOf(currency) + 1) % CURRENCIES.length;
    changeCurrency(CURRENCIES[nextIndex]);
  };

  const renderItem = ({ item }) => {
    const isIncome = item.type === 'credit' || item.type === 'refund';
    const amountColor = isIncome ? '#2E7D32' : '#C62828'; 
    const sign = isIncome ? '+' : '-';

    return (
      <TouchableOpacity 
        style={[styles.card, { backgroundColor: cardBg }]} 
        activeOpacity={0.7}
        onPress={() => navigation.navigate('InputModal', { transaction: item })}
      >
        <View style={styles.cardTop}>
          <Text style={[styles.category, { color: textColor }]}>{item.category}</Text>
          <Text style={[styles.amount, { color: amountColor }]}>{sign}{currency}{item.amount}</Text>
        </View>
        <View style={styles.cardBottom}>
          <Text style={[styles.details, { color: subTextColor }]}>
            {item.payment_mode} {item.merchant ? `• ${item.merchant}` : ''}
          </Text>
          <Text style={styles.date}>{new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: themeBg }]}>
      <View style={styles.headerContainer}>
         <Text style={[styles.header, { color: headerColor }]}>Ledger</Text>
         <TouchableOpacity 
            onPress={handleCurrencyCycle} 
            style={[styles.currencyBadge, { backgroundColor: isDark ? '#ffffff' : '#1c1c1e' }]} 
            activeOpacity={0.8}
         >
           <Text style={{ color: isDark ? '#000000' : '#ffffff', fontWeight: '800', fontSize: 16 }}>{currency}</Text>
         </TouchableOpacity>
      </View>
      
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchTransactions} tintColor={isDark ? '#fff' : '#000'} />}
        ListEmptyComponent={<Text style={styles.emptyText}>No transactions yet.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 15 },
  header: { fontSize: 34, fontWeight: '800', letterSpacing: -0.5 },
  currencyBadge: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  listContent: { padding: 15, paddingBottom: 100 },
  card: { padding: 18, borderRadius: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 2 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  category: { fontSize: 17, fontWeight: '700' },
  amount: { fontSize: 18, fontWeight: '800' },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  details: { fontSize: 14, fontWeight: '500' },
  date: { fontSize: 13, color: '#888', fontWeight: '600' },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#888', fontSize: 16 }
});