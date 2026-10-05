import React, { useState, useEffect } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, StyleSheet, TouchableOpacity, useColorScheme, Platform, SafeAreaView, StatusBar } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from './lib/supabase';
import Auth from './Auth';
import Input from './Input';
import Ledger from './Ledger'; 
import Planner from './Planner';
import Summary from './Summary';
import { CurrencyProvider } from './CurrencyContext'; 

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const CustomInputButton = ({ onPress, isDark }) => (
  <TouchableOpacity style={styles.fabContainer} onPress={onPress} activeOpacity={0.85}>
    <View style={[
      styles.fab, 
      { 
        backgroundColor: isDark ? '#ffffff' : '#1c1c1e', 
        shadowColor: isDark ? '#ffffff' : '#000000' 
      }
    ]}>
      <Ionicons name="add" size={32} color={isDark ? '#000000' : '#ffffff'} style={{ marginLeft: 2 }} />
    </View>
  </TouchableOpacity>
);

function TabNavigator() {
  const isDark = useColorScheme() === 'dark';

  return (
    <Tab.Navigator 
      initialRouteName="Ledger"
      screenOptions={{ 
        headerShown: false, 
        tabBarStyle: { 
          position: 'absolute', 
          bottom: 0,
          width: '100%', 
          alignSelf: 'center',
          // HARDCODED to 90px/25px to force iOS native spacing in web mode
          height: 90, 
          paddingBottom: 25, 
          paddingTop: 10,
          backgroundColor: 'transparent', 
          borderTopWidth: 0, 
          elevation: 0, 
        },
        tabBarBackground: () => (
          <BlurView 
            tint={isDark ? "dark" : "light"} 
            intensity={85} 
            style={StyleSheet.absoluteFill} 
          />
        ),
        tabBarActiveTintColor: isDark ? '#ffffff' : '#1c1c1e',
        tabBarInactiveTintColor: '#8e8e93',
        tabBarLabelStyle: { fontWeight: '700', fontSize: 11, marginTop: 2 }
      }}
    >
      <Tab.Screen 
        name="Ledger" 
        component={Ledger} 
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "wallet" : "wallet-outline"} size={26} color={color} />
          )
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            const state = navigation.getState();
            if (state.routes[state.index].name === 'Ledger') {
              navigation.navigate('Summary');
            } else {
              navigation.navigate('Ledger');
            }
          },
        })}
      />
      
      <Tab.Screen 
        name="InputButton" 
        component={View} 
        options={({ navigation }) => ({
          tabBarLabel: '', 
          tabBarIcon: () => null, 
          tabBarButton: (props) => (
            <CustomInputButton isDark={isDark} onPress={() => navigation.navigate('InputModal', { transaction: null })} />
          )
        })}
      />
      
      <Tab.Screen 
        name="Planner" 
        component={Planner} 
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "calendar" : "calendar-outline"} size={26} color={color} />
          )
        }}
      />

      <Tab.Screen 
        name="Summary" 
        component={Summary} 
        options={{ tabBarButton: () => null }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const isDark = useColorScheme() === 'dark';

  const CustomDarkTheme = {
    ...DarkTheme,
    colors: { ...DarkTheme.colors, background: '#000000', card: 'transparent', border: 'transparent' },
  };

  useEffect(() => {
    if (Platform.OS === 'web') {
      let metaTheme = document.querySelector('meta[name="theme-color"]');
      if (!metaTheme) {
        metaTheme = document.createElement('meta');
        metaTheme.name = "theme-color";
        document.head.appendChild(metaTheme);
      }
      metaTheme.content = isDark ? "#000000" : "#ffffff";

      // FIXED: Added lowercase 'ionicons' alongside uppercase 'Ionicons'
      const style = document.createElement('style');
      style.id = 'vector-icons-fix';
      style.textContent = `
        @font-face {
          font-family: 'ionicons';
          src: url('https://cdnjs.cloudflare.com/ajax/libs/react-native-vector-icons/10.0.3/Fonts/Ionicons.ttf') format('truetype');
        }
        @font-face {
          font-family: 'Ionicons';
          src: url('https://cdnjs.cloudflare.com/ajax/libs/react-native-vector-icons/10.0.3/Fonts/Ionicons.ttf') format('truetype');
        }
      `;
      document.head.appendChild(style);
      
      return () => {
        const el = document.getElementById('vector-icons-fix');
        if (el) el.remove();
      };
    }
  }, [isDark]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));

    return () => {
      if (authListener && authListener.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []);

  if (!session || !session.user) return <Auth />;

  return (
    <CurrencyProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#000000' : '#ffffff' }}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <View style={styles.webContainer}>
          <NavigationContainer theme={isDark ? CustomDarkTheme : DefaultTheme}>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              <Stack.Screen name="MainTabs" component={TabNavigator} />
              <Stack.Screen 
                name="InputModal" 
                component={Input} 
                options={{ 
                  presentation: 'transparentModal',
                  animation: 'fade',
                  contentStyle: { backgroundColor: 'transparent' } 
                }} 
              />
            </Stack.Navigator>
          </NavigationContainer>
        </View>
      </SafeAreaView>
    </CurrencyProvider>
  );
}

const styles = StyleSheet.create({
  webContainer: {
    flex: 1,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 430 : '100%',
    alignSelf: 'center', 
    backgroundColor: 'transparent'
  },
  fabContainer: { 
    top: -18, 
    justifyContent: 'center', 
    alignItems: 'center',
    zIndex: 100 
  },
  fab: { 
    width: 60, 
    height: 60, 
    borderRadius: 30, 
    justifyContent: 'center', 
    alignItems: 'center', 
    shadowOffset: { width: 0, height: 8 }, 
    shadowOpacity: 0.35, 
    shadowRadius: 12, 
    elevation: 8 
  }
});