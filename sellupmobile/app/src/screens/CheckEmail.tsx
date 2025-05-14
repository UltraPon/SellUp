import React from 'react';
import { View, Text, StyleSheet, Pressable, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/navigation';
import { StackNavigationProp } from '@react-navigation/stack';

const CheckEmail = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  const handleLoginPress = () => {
    navigation.navigate('Login');
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconContainer}>
          {/* Иконка письма */}
          <Text style={styles.mailIcon}>✉️</Text>
        </View>
        <Text style={styles.title}>Пожалуйста, проверьте свою почту</Text>
        <Text style={styles.text}>
          Мы отправили письмо с подтверждением на ваш email.
          Пожалуйста, откройте письмо и перейдите по ссылке,
          чтобы завершить регистрацию.
        </Text>
        <Pressable
          style={({ pressed }) => [
            styles.loginButton,
            pressed && styles.loginButtonPressed
          ]}
          onPress={handleLoginPress}
        >
          <Text style={styles.loginButtonText}>Перейти к авторизации</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 20,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    padding: 40,
    width: '100%',
    maxWidth: 500,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 24,
  },
  mailIcon: {
    fontSize: 64,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
    textAlign: 'center',
  },
  text: {
    fontSize: 16,
    color: '#64748b',
    lineHeight: 24,
    marginBottom: 24,
    textAlign: 'center',
  },
  loginButton: {
    backgroundColor: '#4f46e5',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 6,
    marginTop: 16,
  },
  loginButtonPressed: {
    backgroundColor: '#4338ca',
  },
  loginButtonText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 16,
  },
});

export default CheckEmail;