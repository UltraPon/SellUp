import { useEffect, useState } from 'react';
import axios, { AxiosError } from 'axios';
import { getCookie } from '../utils/csrf';

interface ProfileData {
    username: string;
    email: string;
    phone_number: string;
}

const API_URL = process.env.REACT_APP_API_URL;

export const useProfile = () => {
    const [loading, setLoading] = useState(false);
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [formData, setFormData] = useState<{ username: string; phone_number: string }>({ username: '', phone_number: '' });
    const [error, setError] = useState<string | null>(null);

    const fetchProfile = async () => {
        try {
            setLoading(true);

            // 1. Получаем CSRF токен
            await axios.get(`${API_URL}csrf/`, {
                withCredentials: true
            });

            // 2. Запрашиваем профиль
            const response = await axios.get(`${API_URL}profile/`, {
                withCredentials: true,
                headers: {
                    'X-CSRFToken': getCookie('csrftoken') || ''
                }
            });

            const profileData: ProfileData = {
                username: response.data.username || '',
                email: response.data.email || '',
                phone_number: response.data.phone_number || ''
            };

            setProfile(profileData);
            setFormData({
                username: profileData.username,
                phone_number: profileData.phone_number
            });
        } catch (error: unknown) {
            console.error('Ошибка при загрузке профиля:', error);
            if (error instanceof AxiosError && error.response?.status === 403) {
                await refreshAuthToken();
            } else {
                setError('Не удалось загрузить профиль');
            }
        } finally {
            setLoading(false);
        }
    };

    const refreshAuthToken = async () => {
        try {
            const response = await axios.post(
                `${API_URL}auth/refresh/`,
                { refresh: localStorage.getItem('refresh_token') },
                { withCredentials: true }
            );

            localStorage.setItem('access_token', response.data.access);
            fetchProfile();
        } catch (refreshError) {
            console.error('Ошибка обновления токена:', refreshError);
            handleLogout();
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        setProfile(null);
    };

    useEffect(() => {
        fetchProfile();
    }, []);

    return { loading, profile, formData, setFormData, error, fetchProfile, handleLogout };
};
