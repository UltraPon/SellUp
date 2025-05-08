import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/navigation';
import axios from 'axios';
import Icon from 'react-native-vector-icons/MaterialIcons';

const ResetPasswordPage = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const route = useRoute();
  const { token } = route.params as { token: string };
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const API_URL = 'http://192.168.1.4:8000/api/test/'; // Replace with your API URL

  // Check token validity
  useEffect(() => {
    const checkTokenValidity = async () => {
      try {
        await axios.get(
          `${API_URL}/api/validate-reset-token/${token}/`
        );
        setTokenValid(true);
      } catch (err) {
        setTokenValid(false);
        setError('Ссылка для сброса пароля недействительна или устарела');
      }
    };

    checkTokenValidity();
  }, [token]);

  const handleSubmit = async () => {
    if (newPassword !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.post(
        `${API_URL}/api/reset-password/${token}/`,
        {
          new_password: newPassword,
          confirm_password: confirmPassword
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      setMessage(response.data.message || 'Пароль успешно изменен!');
      Alert.alert('Успех', 'Пароль успешно изменен!', [
        { text: 'OK', onPress: () => navigation.navigate('Login') }
      ]);
    } catch (err: any) {
      const errorData = err.response?.data;
      if (errorData?.new_password) {
        setError(errorData.new_password.join(' '));
      } else {
        setError(errorData?.detail ||
               errorData?.message ||
               'Произошла ошибка при смене пароля');
      }
    } finally {
      setLoading(false);
    }
  };

  if (tokenValid === null) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Проверка ссылки...</Text>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      </SafeAreaView>
    );
  }

  if (!tokenValid) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.invalidTokenContainer}>
            <Icon name="error-outline" size={48} color="#ef4444" />
            <Text style={styles.invalidTokenTitle}>Недействительная ссылка</Text>
            <Text style={styles.invalidTokenText}>
              Ссылка для сброса пароля недействительна или устарела.
            </Text>
            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => navigation.navigate('ForgotPasswordPage')}
            >
              <Text style={styles.linkButtonText}>Запросить новую ссылку</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>Смена пароля</Text>
          <Text style={styles.subtitle}>
            Введите новый пароль для вашего аккаунта
          </Text>
        </View>

        <View style={styles.formContainer}>
          {error ? (
            <View style={styles.errorContainer}>
              <Icon name="error-outline" size={20} color="#ef4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {message ? (
            <View style={styles.successContainer}>
              <Icon name="check-circle" size={20} color="#10b981" />
              <Text style={styles.successText}>{message}</Text>
            </View>
          ) : null}

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Новый пароль</Text>
            <TextInput
              style={styles.input}
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Введите новый пароль"
              placeholderTextColor="#9ca3af"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Подтвердите пароль</Text>
            <TextInput
              style={styles.input}
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Подтвердите новый пароль"
              placeholderTextColor="#9ca3af"
            />
          </View>

          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Изменить пароль</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  invalidTokenContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  invalidTokenTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ef4444',
    marginTop: 10,
  },
  invalidTokenText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
  },
  linkButton: {
    marginTop: 20,
  },
  linkButtonText: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: '500',
  },
  header: {
    marginBottom: 30,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
    padding: 12,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorText: {
    color: '#b91c1c',
    marginLeft: 8,
    flex: 1,
  },
  successContainer: {
    backgroundColor: '#ecfdf5',
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
    padding: 12,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  successText: {
    color: '#065f46',
    marginLeft: 8,
    flex: 1,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1f2937',
  },
  submitButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ResetPasswordPage;