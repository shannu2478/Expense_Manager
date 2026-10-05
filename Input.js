import React, { useState, useEffect, useContext } from 'react';
import { View, Text, TextInput, Alert, TouchableOpacity, ScrollView, Keyboard, useColorScheme, KeyboardAvoidingView, Platform } from 'react-native';
import { supabase } from './lib/supabase';
import { CurrencyContext } from './CurrencyContext'; // NEW IMPORT

const PAYMENT_MODES = ['UPI', 'Cash', 'Others'];
const TRANSACTION_TYPES = [
  { id: 'debit', label: 'Expense', color: '#C62828' }, 
  { id: 'credit', label: 'Income', color: '#2E7D32' }  
];

export default function Input({ route, navigation }) {
  const { currency } = useContext(CurrencyContext);
  const [id, setId] = useState(null); 
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [merchant, setMerchant] = useState('');
  const [type, setType] = useState('debit'); 
  const [paymentMode, setPaymentMode] = useState('UPI');
  const [customPaymentMode, setCustomPaymentMode] = useState('');
  const [utrNumber, setUtrNumber] = useState('');
  const [loading, setLoading] = useState(false);

  const isDark = useColorScheme() === 'dark';
  const popupBg = isDark ? '#111111' : '#ffffff';
  const textColor = isDark ? '#ffffff' : '#1c1c1e';
  const subTextColor = isDark ? '#aaaaaa' : '#8e8e93';
  const inputBg = isDark ? '#1c1c1e' : '#f2f2f7';
  const dividerColor = isDark ? '#222222' : '#f2f2f7';
  const segmentBg = isDark ? '#1c1c1e' : '#e5e5ea';

  useEffect(() => {
    if (route.params?.transaction) {
      const t = route.params.transaction;
      setId(t.id); setAmount(t.amount.toString()); setCategory(t.category);
      setMerchant(t.merchant || ''); setType(t.type); setUtrNumber(t.utr_number || '');
      if (['UPI', 'Cash'].includes(t.payment_mode)) { setPaymentMode(t.payment_mode); setCustomPaymentMode(''); } else { setPaymentMode('Others'); setCustomPaymentMode(t.payment_mode || ''); }
    } else {
      setId(null); setAmount(''); setCategory(''); setMerchant(''); setType('debit'); setPaymentMode('UPI'); setCustomPaymentMode(''); setUtrNumber('');
    }
  }, [route.params]);

  const saveTransaction = async () => {
    Keyboard.dismiss();
    if (!amount || !category) return Alert.alert('Missing Info', 'Enter both an amount and a category.');
    if (paymentMode === 'Others' && !customPaymentMode.trim()) return Alert.alert('Missing Info', 'Specify the custom payment mode.');

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const finalPaymentMode = paymentMode === 'Others' ? customPaymentMode.trim() : paymentMode;
      const transactionData = {
        user_id: user.id, amount: parseFloat(amount), category: category.trim(),
        merchant: merchant.trim(), type: type, payment_mode: finalPaymentMode,
        utr_number: utrNumber.trim() !== '' ? utrNumber.trim() : null
      };
      const { error } = id ? await supabase.from('transactions').update(transactionData).eq('id', id) : await supabase.from('transactions').insert([transactionData]);
      if (error) Alert.alert('Database Error', error.message); else navigation.goBack(); 
    } catch (err) { Alert.alert('Error', err.message); } finally { setLoading(false); }
  };

  const deleteTransaction = async () => {
    Alert.alert('Delete', 'Permanently delete this entry?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => {
          setLoading(true);
          const { error } = await supabase.from('transactions').delete().eq('id', id);
          setLoading(false);
          if (error) Alert.alert('Error', error.message); else navigation.goBack();
        }
    }]);
  };

  const activeColor = TRANSACTION_TYPES.find(t => t.id === type)?.color || '#C62828';

  return (
    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={{ backgroundColor: popupBg, borderRadius: 28, maxHeight: '90%', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10, overflow: 'hidden' }}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <View style={{ padding: 20 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <Text style={{ fontSize: 24, fontWeight: '800', color: textColor, letterSpacing: -0.5 }}>{id ? 'Edit Entry' : 'New Entry'}</Text>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ backgroundColor: segmentBg, width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' }}><Text style={{ fontSize: 14, fontWeight: '800', color: subTextColor }}>✕</Text></TouchableOpacity>
              </View>
              
              <View style={{ flexDirection: 'row', backgroundColor: segmentBg, borderRadius: 14, padding: 4, marginBottom: 20 }}>
                {TRANSACTION_TYPES.map((t) => {
                  const isActive = type === t.id;
                  return (
                    <TouchableOpacity key={t.id} style={[{ flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 }, isActive && { backgroundColor: t.color, shadowOpacity: 0.2, elevation: 2 }]} onPress={() => setType(t.id)} activeOpacity={0.8}><Text style={{ color: isActive ? '#fff' : subTextColor, fontWeight: isActive ? '800' : '700', fontSize: 13 }}>{t.label}</Text></TouchableOpacity>
                  );
                })}
              </View>

              <View style={{ backgroundColor: inputBg, borderRadius: 20, padding: 16, marginBottom: 15 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 5 }}>
                  <Text style={{ fontSize: 28, fontWeight: '600', marginRight: 6, color: activeColor }}>{currency}</Text>
                  <TextInput style={{ fontSize: 40, fontWeight: '800', textAlign: 'center', minWidth: 80, color: activeColor }} placeholder="0.00" placeholderTextColor={isDark ? '#444' : '#c7c7cc'} keyboardType="decimal-pad" value={amount} onChangeText={setAmount} />
                </View>
                <View style={{ height: 1, backgroundColor: dividerColor, marginVertical: 8 }} />
                <TextInput style={{ color: textColor, paddingVertical: 10, fontSize: 16, fontWeight: '500' }} placeholder="Category *" placeholderTextColor={subTextColor} value={category} onChangeText={setCategory} />
              </View>

              <Text style={{ fontSize: 12, fontWeight: '700', color: subTextColor, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5, paddingLeft: 5 }}>Mode of Payment</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 15 }}>
                {PAYMENT_MODES.map((mode) => {
                  const isActive = paymentMode === mode;
                  return (
                    <TouchableOpacity key={mode} style={[{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: inputBg, borderWidth: 1, borderColor: 'transparent' }, isActive && { backgroundColor: activeColor, borderColor: activeColor }]} onPress={() => setPaymentMode(mode)} activeOpacity={0.8}><Text style={{ color: isActive ? '#fff' : subTextColor, fontWeight: isActive ? 'bold' : '700', fontSize: 13 }}>{mode}</Text></TouchableOpacity>
                  )
                })}
              </View>

              {paymentMode === 'Others' && (<View style={{ backgroundColor: inputBg, borderRadius: 16, padding: 12, marginBottom: 15 }}><TextInput style={{ color: textColor, fontSize: 16, fontWeight: '500' }} placeholder="Specify Mode *" placeholderTextColor={subTextColor} value={customPaymentMode} onChangeText={setCustomPaymentMode} /></View>)}
              <View style={{ backgroundColor: inputBg, borderRadius: 20, padding: 16, marginBottom: 20 }}>
                <TextInput style={{ color: textColor, paddingVertical: 4, fontSize: 16, fontWeight: '500' }} placeholder="Merchant / Note (Optional)" placeholderTextColor={subTextColor} value={merchant} onChangeText={setMerchant} />
                <View style={{ height: 1, backgroundColor: dividerColor, marginVertical: 12 }} />
                <TextInput style={{ color: textColor, paddingVertical: 4, fontSize: 16, fontWeight: '500' }} placeholder="UTR / Ref No. (Optional)" placeholderTextColor={subTextColor} value={utrNumber} onChangeText={setUtrNumber} />
              </View>

              <TouchableOpacity style={{ backgroundColor: activeColor, paddingVertical: 16, borderRadius: 16, alignItems: 'center' }} onPress={saveTransaction} activeOpacity={0.8} disabled={loading}><Text style={{ color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 }}>{loading ? 'Processing...' : (id ? 'Update Entry' : 'Save Entry')}</Text></TouchableOpacity>
              {id && (<TouchableOpacity style={{ paddingVertical: 14, alignItems: 'center', marginTop: 5 }} onPress={deleteTransaction} activeOpacity={0.8}><Text style={{ color: '#ff3b30', fontSize: 15, fontWeight: '700' }}>Delete Entry</Text></TouchableOpacity>)}
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}