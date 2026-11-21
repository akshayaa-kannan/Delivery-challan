import { setActiveCompanyContext } from './storage';

/**
 * Checks if a user is currently authenticated in session
 */
export const checkLogin = () => {
  return !!localStorage.getItem('nayaruvi_session_uid');
};

/**
 * Gets the current logged in user's role
 */
export const getUserRole = () => {
  return localStorage.getItem('nayaruvi_user_role') || 'OWNER';
};

/**
 * Cache current role
 */
export const setUserRole = (role) => {
  localStorage.setItem('nayaruvi_user_role', role);
};

/**
 * Logs the user out
 */
export const logout = async () => {
  localStorage.removeItem('nayaruvi_session_uid');
  localStorage.removeItem('nayaruvi_user_role');
  localStorage.removeItem('nayaruvi_active_company_id');
  setActiveCompanyContext(null, null);
};
