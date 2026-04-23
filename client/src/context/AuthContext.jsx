import { createContext, useContext, useReducer, useEffect } from 'react';
import * as authService from '../services/authService';

const AuthContext = createContext(null);

const initialState = {
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: false,
  isLoading: true
};

function reducer(state, action) {
  switch (action.type) {
    case 'LOGIN':
      return { ...state, user: action.payload.user, token: action.payload.token, isAuthenticated: true, isLoading: false };
    case 'LOGOUT':
      return { ...state, user: null, token: null, isAuthenticated: false, isLoading: false };
    case 'LOADED':
      return { ...state, isLoading: false };
    case 'UPDATE_USER':
      return { ...state, user: action.payload };
    default:
      return state;
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    if (state.token) {
      authService.getMe()
        .then(res => dispatch({ type: 'LOGIN', payload: { user: res.data.user, token: state.token } }))
        .catch(() => {
          localStorage.removeItem('token');
          dispatch({ type: 'LOGOUT' });
        });
    } else {
      dispatch({ type: 'LOADED' });
    }
  }, []);

  const login = async (email, password) => {
    const res = await authService.login(email, password);
    localStorage.setItem('token', res.data.token);
    dispatch({ type: 'LOGIN', payload: res.data });
    return res.data;
  };

  const register = async (data) => {
    const res = await authService.register(data);
    localStorage.setItem('token', res.data.token);
    dispatch({ type: 'LOGIN', payload: res.data });
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    dispatch({ type: 'LOGOUT' });
  };

  const updateUser = (user) => {
    dispatch({ type: 'UPDATE_USER', payload: user });
  };

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
