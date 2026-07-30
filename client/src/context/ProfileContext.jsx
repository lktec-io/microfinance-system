import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from './AuthContext';

const ProfileCtx = createContext({ profileImg: null, setProfileImg: () => {} });

function avatarKey(user) {
  return `mf_avatar_${user?.email || '_anon'}`;
}

export function ProfileProvider({ children }) {
  const { user } = useAuth();
  const [profileImg, _set] = useState(null);

  useEffect(() => {
    _set(localStorage.getItem(avatarKey(user)) || null);
  }, [user]);

  const setProfileImg = useCallback((url) => {
    const k = avatarKey(user);
    if (url) localStorage.setItem(k, url);
    else localStorage.removeItem(k);
    _set(url || null);
  }, [user]);

  return (
    <ProfileCtx.Provider value={{ profileImg, setProfileImg }}>
      {children}
    </ProfileCtx.Provider>
  );
}

export function useProfileImage() {
  return useContext(ProfileCtx);
}
