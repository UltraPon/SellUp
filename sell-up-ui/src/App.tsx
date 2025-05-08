// src/App.tsx
import React from 'react';
import axios from 'axios';
import { Routes, Route } from 'react-router-dom';
import Listing from './pages/Listing';
import Register from './pages/Register';
import Login from './pages/Login';
import Profile from './pages/Profile';
import CheckEmail from './pages/CheckEmail';
import CreateAdPage from './pages/CreateAdPage';
import ListingDetails from './pages/ListingDetails';
import MyAdsPage from './pages/MyAdsPage';
import MyFavoritesPage from './pages/MyFavoritesPage';
import MessagePage from './pages/MessagePage';
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";

// Настраиваем базовый URL для всех запросов
axios.defaults.baseURL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000/api';

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Listing />} />
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<Login />} />
      <Route path="/check-email" element={<CheckEmail />} />
      <Route path="/profile" element={<Profile />} />

      <Route path="/create-ad" element={<CreateAdPage />} />
      <Route path="/listing/:id" element={<ListingDetails />} />

      <Route path="/my-ads" element={<MyAdsPage />} />
      <Route path="/my-favorites" element={<MyFavoritesPage />} />

      {/* Список чатов */}
      <Route path="/messages" element={<MessagePage />} />
      {/* Конкретный диалог */}
      <Route path="/messages/:userId" element={<MessagePage />} />

      <Route path="/forgot-password" element={<ForgotPasswordPage/>}></Route>

      <Route path="/reset-password/:token" element={<ResetPasswordPage/>}></Route>
    </Routes>
  );
};

export default App;
