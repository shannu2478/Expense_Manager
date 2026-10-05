import React, { useState, useEffect, useContext } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, Keyboard, ScrollView, useColorScheme } from 'react-native';
import { supabase } from './lib/supabase';
import { CurrencyContext } from './CurrencyContext'; // NEW IMPORT

export default function Planner() {
  const { currency } = useContext(CurrencyContext);
  const [content, setContent] = useState('');
  const [calculatedTotal, setCalculatedTotal] = useState(0);
  const [detectedBills, setDetectedBills] = useState([]);
  const [checkedBills, setCheckedBills] = useState({}); 
  const [loading, setLoading] = useState(false);
  const [noteId, setNoteId] = useState(null);

  const isDark = useColorScheme() === 'dark';
  const themeBg = isDark ? '#000000' : '#f2f2f7';
  const cardBg = isDark ? '#111111' : '#ffffff';
  const textColor = isDark ? '#ffffff' : '#1c1c1e';
  const subTextColor = isDark ? '#aaaaaa' : '#8e8e93';
  const borderColor = isDark ? '#222222' : '#e0e0e0';

  useEffect(() => { fetchNote(); }, []);
  useEffect(() => { parseAndCalculate(content, checkedBills); }, [content, checkedBills]);

  const fetchNote = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('notes').select('*').eq('user_id', user.id).limit(1).single();
      if (data) { setContent(data.content); setNoteId(data.id); }
    }
  };

  const parseAndCalculate = (text, checkedState) => {
    if (!text) { setCalculatedTotal(0); setDetectedBills([]); return; }
    let total = 0, foundBills = [];
    
    // Universal regex to catch ANY symbol safely
    const regex = /([a-zA-Z0-9_]+(?:\s[a-zA-Z0-9_]+){0,3})\s*[-:]\s*(?:[^\d\s]+\s*)?(\d+(?:\.\d+)?)/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      let name = match[1].trim().replace(/^(and|also|plus|then)\s+/i, '');
      let amount = parseFloat(match[2]);
      let billId = `${name}-${amount}-${match.index}`;
      foundBills.push({ id: billId, name, amount });
      if (!checkedState[billId]) total += amount;
    }
    setDetectedBills(foundBills);
    setCalculatedTotal(total);
  };

  const toggleCheck = (id) => setCheckedBills(prev => ({ ...prev, [id]: !prev[id] }));

  const saveNote = async () => {
    setLoading(true); Keyboard.dismiss();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    let error;
    if (noteId) {
      const { error: err } = await supabase.from('notes').update({ content }).eq('id', noteId);
      error = err;
    } else {
      const { data, error: err } = await supabase.from('notes').insert([{ user_id: user.id, content }]).select().single();
      if (data) setNoteId(data.id);
      error = err;
    }
    setLoading(false);
    if (error) Alert.alert('Error', error.message);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[styles.container, { backgroundColor: themeBg }]}>
      <ScrollView style={styles.scrollArea} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled">
        
        <View style={styles.headerContainer}>
          <Text style={[styles.header, { color: textColor }]}>Planner</Text>
          <View style={styles.totalBadge}>
            <Text style={styles.totalText}>{currency}{calculatedTotal.toLocaleString()}</Text>
          </View>
        </View>

        <View style={[styles.textAreaContainer, { backgroundColor: cardBg }]}>
          <TextInput style={[styles.textArea, { color: textColor }]} multiline={true} scrollEnabled={false} placeholder={`Rent - ${currency}6500...`} placeholderTextColor={subTextColor} value={content} onChangeText={setContent} />
        </View>

        {detectedBills.length > 0 && (
          <View style={[styles.checklistContainer, { backgroundColor: cardBg }]}>
            {detectedBills.map((bill) => {
              const isChecked = checkedBills[bill.id];
              return (
                <TouchableOpacity key={bill.id} style={[styles.checklistItem, isChecked && styles.checklistItemDone, { borderBottomColor: borderColor }]} onPress={() => toggleCheck(bill.id)} activeOpacity={0.7}>
                  <View style={[styles.checkbox, isChecked && styles.checkboxActive, { borderColor: isDark ? '#444' : '#c7c7cc', backgroundColor: isDark ? '#222' : '#fff' }]}>
                    {isChecked && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={[styles.checklistText, { color: textColor }, isChecked && styles.checklistTextDone]}>
                    {bill.name} : {currency}{bill.amount}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <TouchableOpacity style={styles.saveButton} onPress={saveNote} disabled={loading}>
          <Text style={styles.saveButtonText}>{loading ? 'Saving...' : 'Save Notes'}</Text>
        </TouchableOpacity>
        <View style={styles.bottomPadding} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, scrollArea: { flex: 1 },
  headerContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 15 },
  header: { fontSize: 34, fontWeight: '800', letterSpacing: -0.5 },
  totalBadge: { backgroundColor: '#C62828', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  totalText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  textAreaContainer: { margin: 15, borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 4 },
  textArea: { padding: 24, fontSize: 17, minHeight: 180, lineHeight: 26, fontWeight: '500' },
  checklistContainer: { marginHorizontal: 15, marginBottom: 15, borderRadius: 20, padding: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 4 },
  checklistItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  checklistItemDone: { opacity: 0.4 }, checkbox: { width: 24, height: 24, borderRadius: 8, borderWidth: 2, marginRight: 15, justifyContent: 'center', alignItems: 'center' }, checkboxActive: { backgroundColor: '#2E7D32', borderColor: '#2E7D32' }, checkmark: { color: '#fff', fontWeight: '900', fontSize: 14, marginTop: -2 }, checklistText: { fontSize: 16, flex: 1, fontWeight: '600' }, checklistTextDone: { textDecorationLine: 'line-through', color: '#8e8e93' },
  saveButton: { backgroundColor: '#007AFF', marginHorizontal: 15, marginTop: 10, padding: 18, borderRadius: 16, alignItems: 'center', shadowColor: '#007AFF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 }, saveButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 18 }, bottomPadding: { height: 60 }
});