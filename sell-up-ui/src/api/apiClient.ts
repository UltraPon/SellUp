import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api/',
  withCredentials: true,
});

export { api };

export const fetchListings = async () => {
  try {
    const response = await api.get('listings/');
    return response.data;
  } catch (error) {
    console.error('Error fetching listings:', error);
    return [];
  }
};

export const fetchCategories = async () => {
  try {
    const response = await api.get('categories/');
    return response.data;
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
};
