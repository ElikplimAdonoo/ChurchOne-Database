import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { canManageUnit, getManagedUnitIds } from '../utils/permissionsUtils';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserRole(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // 2. Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserRole(session.user.id);
      } else {
        setUserRole(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchUserRole(userId) {
    try {
      // Call the Postgres function we created
      const { data, error } = await supabase.rpc('get_current_user_role');
      
      if (error) {
        console.error("Error fetching user role:", error);
        setUserRole(null);
      } else if (data && data.length > 0) {
        // The function returns an array, but we LIMIT 1, so take the first
        setUserRole({
          title: data[0].position_title,
          unitName: data[0].unit_name,
          unitType: data[0].unit_type,
          unitId: data[0].unit_id,
          personId: data[0].person_id,
          fullName: data[0].full_name,
          photoUrl: data[0].photo_url
        });
      } else {
         // User loggeg in but no profile found in 'people' table logic
         console.warn("User logged in but no linked 'people' record found.");
         setUserRole(null);
      }
    } catch (err) {
      console.error("Unexpected error fetching role:", err);
    } finally {
      setLoading(false);
    }
  }

  const canManage = useCallback(async (targetUnitId) => {
      if (!userRole) return false;
      return await canManageUnit(userRole, targetUnitId);
  }, [userRole]);

  const getManagedUnits = useCallback(async () => {
      if (!userRole) return new Set();
      return await getManagedUnitIds(userRole);
  }, [userRole]);

  const value = {
    session,
    user,
    userRole,
    loading,
    signOut: () => supabase.auth.signOut(),
    canManage,
    getManagedUnits,
  };

  return (
    <AuthContext.Provider value={value}>
      {loading && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-church-blue-500"></div>
        </div>
      )}
      {children}
    </AuthContext.Provider>
  );
}
