import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, useColorScheme, RefreshControl, TouchableOpacity, FlatList } from 'react-native';
import { supabase } from './lib/supabase';
import { CurrencyContext } from './CurrencyContext'; // NEW IMPORT

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const getCategoryIcon = (category) => {
  const cat = category.toLowerCase();
  if (cat.includes('food') || cat.includes('swiggy') || cat.includes('zomato') || cat.includes('dine')) return '🍔';
  if (cat.includes('rent') || cat.includes('home') || cat.includes('house')) return '🏠';
  if (cat.includes('travel') || cat.includes('cab') || cat.includes('uber') || cat.includes('fuel')) return '🚕';
  if (cat.includes('shop') || cat.includes('amazon') || cat.includes('clothes')) return '🛍️';
  if (cat.includes('bill') || cat.includes('utility') || cat.includes('recharge') || cat.includes('jio')) return '📱';
  if (cat.includes('health') || cat.includes('medical') || cat.includes('doctor')) return '💊';
  if (cat.includes('movie') || cat.includes('entertainment')) return '🍿';
  if (cat.includes('grocery') || cat.includes('zepto') || cat.includes('blinkit')) return '🛒';
  return '✨'; 
};

export default function Summary() {
  const { currency } = useContext(CurrencyContext);
  const [allTransactions, setAllTransactions] = useState([]);
  const [plannerNote, setPlannerNote] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  
  const [viewMode, setViewMode] = useState('monthly'); 
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const [income, setIncome] = useState(0);
  const [expense, setExpense] = useState(0);
  const [expenseTrends, setExpenseTrends] = useState([]);
  const [incomeTrends, setIncomeTrends] = useState([]);
  const [dailyTransactions, setDailyTransactions] = useState([]);
  
  const [toPayTotal, setToPayTotal] = useState(0);
  const [pendingItems, setPendingItems] = useState([]);

  const isDark = useColorScheme() === 'dark';
  const themeBg = isDark ? '#000000' : '#f2f2f7';
  const cardBg = isDark ? '#111111' : '#ffffff';
  const textColor = isDark ? '#ffffff' : '#1c1c1e';
  const subTextColor = isDark ? '#aaaaaa' : '#8e8e93';
  const borderColor = isDark ? '#222222' : '#e0e0e0';
  const barBg = isDark ? '#2a2a2a' : '#f2f2f7';
  const iconBg = isDark ? '#1c1c1e' : '#f2f2f7';

  const fetchData = async () => {
    setRefreshing(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: txData } = await supabase.from('transactions').select('*').order('date', { ascending: false }).eq('user_id', user.id);
    if (txData) setAllTransactions(txData);

    const { data: noteData } = await supabase.from('notes').select('content').eq('user_id', user.id).limit(1).single();
    if (noteData && noteData.content) setPlannerNote(noteData.content);

    setRefreshing(false);
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    let targetMonth = currentDate.getMonth();
    let targetYear = currentDate.getFullYear();
    let targetDateStr = currentDate.toDateString();

    let totalIncome = 0;
    let totalExpense = 0;
    let expMap = {};
    let incMap = {};
    let dailyTxs = [];

    allTransactions.forEach(t => {
      const d = new Date(t.date);
      const isMonthMatch = (d.getMonth() === targetMonth && d.getFullYear() === targetYear);
      const isDayMatch = (d.toDateString() === targetDateStr);

      if (isDayMatch) dailyTxs.push(t);
      const isMatch = viewMode === 'monthly' ? isMonthMatch : isDayMatch;
      
      if (isMatch) {
        if (t.type === 'credit' || t.type === 'refund') {
          totalIncome += t.amount;
          incMap[t.category] = (incMap[t.category] || 0) + t.amount;
        } else if (t.type === 'debit') {
          totalExpense += t.amount;
          expMap[t.category] = (expMap[t.category] || 0) + t.amount;
        }
      }
    });

    setIncome(totalIncome);
    setExpense(totalExpense);
    setDailyTransactions(dailyTxs);

    setExpenseTrends(Object.keys(expMap).map(k => ({ category: k, amount: expMap[k] })).sort((a, b) => b.amount - a.amount));
    setIncomeTrends(Object.keys(incMap).map(k => ({ category: k, amount: incMap[k] })).sort((a, b) => b.amount - a.amount));

    let pendingTotal = 0;
    let foundBills = [];
    if (plannerNote) {
      // NEW REGEX: Matches ANY symbol (e.g. $6500, EUR300) instead of just ₹
      const regex = /([a-zA-Z0-9_]+(?:\s[a-zA-Z0-9_]+){0,3})\s*[-:]\s*(?:[^\d\s]+\s*)?(\d+(?:\.\d+)?)/g;
      let match;
      while ((match = regex.exec(plannerNote)) !== null) {
        let name = match[1].trim().replace(/^(and|also|plus|then)\s+/i, '');
        let amount = parseFloat(match[2]);
        foundBills.push({ name, amount });
        pendingTotal += amount;
      }
    }
    setPendingItems(foundBills);
    setToPayTotal(pendingTotal);

  }, [allTransactions, plannerNote, currentDate, viewMode]);

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, currentDate.getDate()));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, currentDate.getDate()));

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const safeExpense = expense || 1;
  const safeIncome = income || 1;

  const renderDateItem = ({ item }) => {
    const iterDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), item);
    const isSelected = item === currentDate.getDate();
    return (
      <TouchableOpacity onPress={() => setCurrentDate(iterDate)} activeOpacity={0.7} style={[styles.dayPill, isSelected && { backgroundColor: isDark ? '#ffffff' : '#1c1c1e' }]}>
        <Text style={[styles.dayTextWeek, { color: isSelected ? (isDark ? '#000' : '#fff') : subTextColor }]}>{WEEKDAYS[iterDate.getDay()]}</Text>
        <Text style={[styles.dayTextNum, { color: isSelected ? (isDark ? '#000' : '#fff') : textColor }]}>{item}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: themeBg }]}>
      <View style={styles.headerContainer}><Text style={[styles.header, { color: textColor }]}>Dashboard</Text></View>
      <View style={[styles.toggleContainer, { backgroundColor: cardBg, borderColor: borderColor }]}>
        <TouchableOpacity style={[styles.toggleBtn, viewMode === 'monthly' && { backgroundColor: isDark ? '#333' : '#e5e5ea' }]} onPress={() => setViewMode('monthly')}><Text style={[styles.toggleText, { color: viewMode === 'monthly' ? textColor : subTextColor }]}>Monthly</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.toggleBtn, viewMode === 'daily' && { backgroundColor: isDark ? '#333' : '#e5e5ea' }]} onPress={() => setViewMode('daily')}><Text style={[styles.toggleText, { color: viewMode === 'daily' ? textColor : subTextColor }]}>Daily</Text></TouchableOpacity>
      </View>
      <View style={[styles.dateSelector, { backgroundColor: cardBg, borderColor: borderColor }]}>
        <TouchableOpacity onPress={prevMonth} style={styles.dateArrow}><Text style={[styles.arrowText, { color: textColor }]}>❮</Text></TouchableOpacity>
        <Text style={[styles.dateText, { color: textColor }]}>{MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}</Text>
        <TouchableOpacity onPress={nextMonth} style={styles.dateArrow}><Text style={[styles.arrowText, { color: textColor }]}>❯</Text></TouchableOpacity>
      </View>
      {viewMode === 'daily' && (
        <View style={styles.dayStripContainer}>
          <FlatList horizontal showsHorizontalScrollIndicator={false} data={daysArray} keyExtractor={item => item.toString()} renderItem={renderDateItem} initialScrollIndex={Math.max(0, currentDate.getDate() - 1)} getItemLayout={(data, index) => ({ length: 60, offset: 60 * index, index })} contentContainerStyle={{ paddingHorizontal: 15 }} />
        </View>
      )}
      <ScrollView style={styles.scrollArea} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchData} tintColor={isDark ? '#fff' : '#000'} />}>
        <View style={styles.metricsContainer}>
          <View style={styles.row}>
            <View style={[styles.halfCard, { backgroundColor: cardBg, borderColor: borderColor }]}><Text style={[styles.cardLabel, { color: subTextColor }]}>Income</Text><Text style={[styles.cardAmountSmall, { color: '#34c759' }]}>{currency}{income.toLocaleString()}</Text></View>
            <View style={[styles.halfCard, { backgroundColor: cardBg, borderColor: borderColor }]}><Text style={[styles.cardLabel, { color: subTextColor }]}>Expense</Text><Text style={[styles.cardAmountSmall, { color: '#ff3b30' }]}>{currency}{expense.toLocaleString()}</Text></View>
          </View>
          {viewMode === 'monthly' && (
            <>
              <View style={[styles.card, { backgroundColor: cardBg, borderColor: borderColor }]}>
                <Text style={[styles.cardTitle, { color: textColor, marginBottom: 20 }]}>Top Expenses</Text>
                {expenseTrends.length === 0 ? <Text style={[styles.emptyText, { color: subTextColor }]}>No expenses recorded.</Text> : (
                  expenseTrends.slice(0, 5).map((item, index) => {
                    const pct = (item.amount / safeExpense) * 100;
                    return (
                      <View key={index} style={styles.modernTrendRow}>
                        <View style={[styles.iconCircle, { backgroundColor: iconBg }]}><Text style={styles.iconText}>{getCategoryIcon(item.category)}</Text></View>
                        <View style={styles.trendDetails}>
                          <View style={styles.trendHeader}><Text style={[styles.trendCategory, { color: textColor }]}>{item.category}</Text><Text style={[styles.trendAmount, { color: textColor }]}>{currency}{item.amount.toLocaleString()}</Text></View>
                          <View style={styles.barWrapper}><View style={[styles.barBackground, { backgroundColor: barBg }]}><View style={[styles.barFill, { backgroundColor: '#ff3b30', width: `${pct}%` }]} /></View><Text style={[styles.pctText, { color: subTextColor }]}>{pct.toFixed(0)}%</Text></View>
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
              <View style={[styles.card, { backgroundColor: cardBg, borderColor: borderColor }]}>
                <View style={styles.cardHeaderRow}><Text style={[styles.cardTitle, { color: textColor }]}>Upcoming Bills</Text><Text style={[styles.cardTitleAmount, { color: '#ff9500' }]}>{currency}{toPayTotal.toLocaleString()}</Text></View>
                <View style={{ height: 1, backgroundColor: borderColor, marginBottom: 15 }} />
                {pendingItems.length === 0 ? <Text style={[styles.emptyText, { color: subTextColor }]}>No upcoming bills found.</Text> : (
                  pendingItems.map((item, index) => (
                    <View key={index} style={styles.billRow}><View style={styles.billBullet} /><Text style={[styles.billName, { color: textColor }]}>{item.name}</Text><Text style={[styles.billAmount, { color: textColor }]}>{currency}{item.amount.toLocaleString()}</Text></View>
                  ))
                )}
              </View>
            </>
          )}
          {viewMode === 'daily' && (
            <View style={[styles.card, { backgroundColor: cardBg, borderColor: borderColor }]}>
              <Text style={[styles.cardTitle, { color: textColor, marginBottom: 20 }]}>Detailed Transactions</Text>
              {dailyTransactions.length === 0 ? <Text style={[styles.emptyText, { color: subTextColor }]}>No transactions on this date.</Text> : (
                dailyTransactions.map((item, index) => {
                  const isIncome = item.type === 'credit' || item.type === 'refund';
                  const amountColor = isIncome ? '#34c759' : '#ff3b30'; 
                  const sign = isIncome ? '+' : '-';
                  return (
                    <View key={item.id} style={[styles.detailedRow, index !== dailyTransactions.length - 1 && { borderBottomWidth: 1, borderBottomColor: borderColor }]}>
                      <View style={[styles.iconCircle, { backgroundColor: iconBg }]}><Text style={styles.iconText}>{isIncome ? '💰' : getCategoryIcon(item.category)}</Text></View>
                      <View style={styles.detailedContent}><Text style={[styles.detailedCategory, { color: textColor }]}>{item.category}</Text><Text style={[styles.detailedMerchant, { color: subTextColor }]}>{item.payment_mode} {item.merchant ? `• ${item.merchant}` : ''}</Text></View>
                      <Text style={[styles.detailedAmount, { color: amountColor }]}>{sign}{currency}{item.amount.toLocaleString()}</Text>
                    </View>
                  );
                })
              )}
            </View>
          )}
        </View>
        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, scrollArea: { flex: 1 },
  headerContainer: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 15 }, header: { fontSize: 36, fontWeight: '800', letterSpacing: -0.5 },
  toggleContainer: { flexDirection: 'row', marginHorizontal: 15, marginBottom: 15, borderRadius: 14, padding: 4, borderWidth: 1 }, toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 }, toggleText: { fontSize: 14, fontWeight: '700' },
  dateSelector: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 15, marginBottom: 15, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 4, borderWidth: 1 }, dateArrow: { padding: 5 }, arrowText: { fontSize: 20, fontWeight: '800' }, dateText: { fontSize: 17, fontWeight: '800', letterSpacing: 0.5 },
  dayStripContainer: { marginBottom: 15 }, dayPill: { width: 52, height: 68, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginHorizontal: 4, paddingVertical: 8 }, dayTextWeek: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 }, dayTextNum: { fontSize: 20, fontWeight: '800' },
  metricsContainer: { paddingHorizontal: 15 }, row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 }, halfCard: { width: '48%', padding: 20, borderRadius: 24, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 3 },
  card: { padding: 24, borderRadius: 24, borderWidth: 1, marginBottom: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 3 }, cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }, cardTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.2 }, cardTitleAmount: { fontSize: 22, fontWeight: '900' }, cardLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }, cardAmountSmall: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  emptyText: { fontStyle: 'italic', fontSize: 14 }, billRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 }, billBullet: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#ff9500', marginRight: 12 }, billName: { flex: 1, fontSize: 16, fontWeight: '600' }, billAmount: { fontSize: 16, fontWeight: '700' },
  modernTrendRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 22 }, iconCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 15 }, iconText: { fontSize: 20 }, trendDetails: { flex: 1 }, trendHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }, trendCategory: { fontSize: 16, fontWeight: '700' }, trendAmount: { fontSize: 16, fontWeight: '800' }, barWrapper: { flexDirection: 'row', alignItems: 'center' }, barBackground: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden', marginRight: 10 }, barFill: { height: 8, borderRadius: 4 }, pctText: { fontSize: 12, fontWeight: '700', width: 35, textAlign: 'right' },
  detailedRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 }, detailedContent: { flex: 1, justifyContent: 'center' }, detailedCategory: { fontSize: 17, fontWeight: '700', marginBottom: 4 }, detailedMerchant: { fontSize: 13, fontWeight: '600' }, detailedAmount: { fontSize: 18, fontWeight: '800' }
});