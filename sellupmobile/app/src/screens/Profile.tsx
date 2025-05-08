import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
  FlatList
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/navigation';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface UserProfile {
  username: string;
  email: string;
  phone_number?: string;
}

interface Listing {
  id: number;
  title: string;
  price: string;
  created_at: string;
}

const Profile = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    phone_number: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [myAds, setMyAds] = useState<Listing[]>([]);
  const [favoriteAds, setFavoriteAds] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const handleChange = (name: keyof typeof formData, value: string) => {
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const fetchProfile = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        navigation.navigate('Login');
        return;
      }

      const response = await axios.get('http://10.0.2.2:8000/api/profile/', {
        headers: {
          'Authorization': `Token ${token}`
        }
      });

      const profileData = {
        username: response.data.username || '',
        email: response.data.email || '',
        phone_number: response.data.phone_number || ''
      };

      setProfile(profileData);
      setFormData({
        username: profileData.username,
        phone_number: profileData.phone_number || ''
      });
    } catch (error) {
      console.error('Ошибка при загрузке профиля:', error);
      setError('Не удалось загрузить профиль');
    }
  };

  const fetchMyAds = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const response = await axios.get('http://10.0.2.2:8000/api/my-listings/', {
        headers: {
          'Authorization': `Token ${token}`
        }
      });
      setMyAds(response.data);
    } catch (error) {
      console.error('Ошибка при загрузке объявлений:', error);
    }
  };

  const fetchFavorites = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const response = await axios.get('http://10.0.2.2:8000/api/favorites/', {
        headers: {
          'Authorization': `Token ${token}`
        }
      });

      const favoritesListings = response.data.map((item: any) => item.listing);
      setFavoriteAds(favoritesListings);
    } catch (error) {
      console.error('Ошибка при загрузке избранного:', error);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        await fetchProfile();
        await fetchMyAds();
        await fetchFavorites();
        setError('');
      } catch (error) {
        console.error('Ошибка при загрузке данных:', error);
        setError('Не удалось загрузить данные');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSave = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Нет токена');

      const response = await axios.put(
        'http://10.0.2.2:8000/api/profile/',
        {
          username: formData.username,
          phone_number: formData.phone_number
        },
        {
          headers: {
            'Authorization': `Token ${token}`
          }
        }
      );

      if (response.status === 200) {
        const updatedProfile = {
          username: response.data.username,
          email: response.data.email,
          phone_number: response.data.phone_number
        };

        setProfile(updatedProfile);
        setIsEditing(false);
      } else {
        setError('Не удалось обновить профиль');
      }
    } catch (error) {
      console.error('Ошибка при обновлении профиля:', error);
      setError('Ошибка при обновлении профиля');
      Alert.alert('Ошибка', 'Не удалось обновить профиль');
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('token');
    navigation.navigate('Login');
  };

  const renderAdItem = ({ item }: { item: Listing }) => (
    <Pressable 
      style={styles.adItem}
      onPress={() => navigation.navigate('ListingDetails', { id: item.id.toString() })}
    >
      <Text style={styles.adTitle}>{item.title}</Text>
      <Text style={styles.adPrice}>{item.price} ₽</Text>
      <Text style={styles.adDate}>
        {new Date(item.created_at).toLocaleDateString('ru-RU')}
      </Text>
    </Pressable>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>SellUp</Text>
        <Pressable onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutButtonText}>Выйти</Text>
        </Pressable>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Профиль пользователя</Text>

        {error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : profile ? (
          <>
            {isEditing ? (
              <View style={styles.editSection}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Имя пользователя:</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.username}
                    onChangeText={(text) => handleChange('username', text)}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Телефон:</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.phone_number}
                    onChangeText={(text) => handleChange('phone_number', text)}
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={styles.buttonRow}>
                  <Pressable style={styles.saveButton} onPress={handleSave}>
                    <Text style={styles.buttonText}>Сохранить</Text>
                  </Pressable>
                  <Pressable 
                    style={styles.cancelButton} 
                    onPress={() => setIsEditing(false)}
                  >
                    <Text style={styles.buttonText}>Отмена</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={styles.profileSection}>
                <View style={styles.profileInfo}>
                  <Text style={styles.infoText}>
                    <Text style={styles.infoLabel}>Имя пользователя: </Text>
                    {profile.username}
                  </Text>
                  <Text style={styles.infoText}>
                    <Text style={styles.infoLabel}>Email: </Text>
                    {profile.email}
                  </Text>
                  {profile.phone_number && (
                    <Text style={styles.infoText}>
                      <Text style={styles.infoLabel}>Телефон: </Text>
                      {profile.phone_number}
                    </Text>
                  )}
                </View>

                <View style={styles.actionButtons}>
                  <Pressable 
                    style={styles.editButton}
                    onPress={() => setIsEditing(true)}
                  >
                    <Text style={styles.buttonText}>Редактировать профиль</Text>
                  </Pressable>

                  <Pressable
                    style={styles.createAdButton}
                    onPress={() => navigation.navigate('CreateAdPage')}
                  >
                    <Text style={styles.buttonText}>Создать объявление</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </>
        ) : null}

        <View style={styles.adsContainer}>
          <View style={styles.adsSection}>
            <Text style={styles.sectionTitle}>Мои объявления</Text>
            {myAds.length > 0 ? (
              <FlatList
                data={myAds}
                renderItem={renderAdItem}
                keyExtractor={(item) => item.id.toString()}
                scrollEnabled={false}
              />
            ) : (
              <Text style={styles.emptyText}>У вас пока нет объявлений</Text>
            )}
            <Pressable 
              style={styles.viewAllButton}
              onPress={() => navigation.navigate('MyAdsPage')}
            >
              <Text style={styles.viewAllText}>Посмотреть все →</Text>
            </Pressable>
          </View>

          <View style={styles.adsSection}>
            <Text style={styles.sectionTitle}>Избранные объявления</Text>
            {favoriteAds.length > 0 ? (
              <FlatList
                data={favoriteAds}
                renderItem={renderAdItem}
                keyExtractor={(item) => item.id.toString()}
                scrollEnabled={false}
              />
            ) : (
              <Text style={styles.emptyText}>У вас пока нет избранных объявлений</Text>
            )}
            <Pressable 
              style={styles.viewAllButton}
              onPress={() => navigation.navigate('MyFavoritesPage')}
            >
              <Text style={styles.viewAllText}>Посмотреть все →</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  logoutButton: {
    padding: 8,
    backgroundColor: '#ef4444',
    borderRadius: 6,
  },
  logoutButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#1a1a1a',
  },
  errorText: {
    color: '#ef4444',
    marginBottom: 20,
    textAlign: 'center',
  },
  editSection: {
    marginBottom: 25,
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 5,
    color: '#374151',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    paddingHorizontal: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  saveButton: {
    flex: 1,
    marginRight: 10,
    padding: 12,
    backgroundColor: '#3b82f6',
    borderRadius: 6,
    alignItems: 'center',
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    backgroundColor: '#9ca3af',
    borderRadius: 6,
    alignItems: 'center',
  },
  profileSection: {
    marginBottom: 25,
  },
  profileInfo: {
    marginBottom: 20,
  },
  infoText: {
    fontSize: 16,
    marginBottom: 8,
    color: '#374151',
  },
  infoLabel: {
    fontWeight: '500',
  },
  actionButtons: {
    gap: 10,
  },
  editButton: {
    padding: 12,
    backgroundColor: '#3b82f6',
    borderRadius: 6,
    alignItems: 'center',
  },
  createAdButton: {
    padding: 12,
    backgroundColor: '#10b981',
    borderRadius: 6,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 16,
  },
  adsContainer: {
    gap: 20,
  },
  adsSection: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#1a1a1a',
  },
  adItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  adTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  adPrice: {
    fontSize: 14,
    color: '#3b82f6',
    marginTop: 3,
  },
  adDate: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 3,
  },
  emptyText: {
    color: '#6b7280',
    textAlign: 'center',
    paddingVertical: 10,
  },
  viewAllButton: {
    marginTop: 10,
    alignSelf: 'flex-end',
  },
  viewAllText: {
    color: '#3b82f6',
    fontWeight: '500',
  },
});

export default Profile;