import { createContext, useContext, useEffect, useState } from 'react';
import { auth, supabase } from '../lib/supabase';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Check for existing session and set up auth state listener
    useEffect(() => {
        const checkAuth = async () => {
            try {
                console.log('Checking for existing session...');
                const { data, error } = await auth.getCurrentUser();

                if (error) {
                    // AuthSessionMissingError is normal when user is not logged in
                    if (error.message && error.message.includes('Auth session missing')) {
                        console.log('No active session found (user not logged in)');
                    } else {
                        console.error('Auth check error:', error);
                    }
                } else if (data && data.user) {
                    console.log('Found existing user:', data.user);
                    setUser(data.user);
                } else {
                    console.log('No existing user found');
                }
            } catch (error) {
                console.error('Auth check failed:', error);
            } finally {
                setIsLoading(false);
            }
        };

        checkAuth();

        // Listen for auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, session) => {
                console.log('Auth state changed:', event, session?.user?.email);
                if (session?.user) {
                    setUser(session.user);
                } else {
                    setUser(null);
                }
            }
        );

        return () => {
            subscription?.unsubscribe();
        };
    }, []);

    const login = async (email, password) => {
        try {
            console.log('Attempting to sign in with:', { email });
            const { data, error } = await auth.signIn(email, password);

            console.log('Login response:', { data, error });

            if (error) {
                console.error('Login error:', error);
                return { success: false, error: error.message };
            }

            if (data && data.user) {
                console.log('User signed in successfully:', data.user);
                setUser(data.user);
                return { success: true };
            }

            console.log('No user in response:', data);
            return { success: false, error: 'ログインに失敗しました' };
        } catch (error) {
            console.error('Login exception:', error);
            return { success: false, error: error.message };
        }
    };

    const signup = async (email, password) => {
        try {
            console.log('Attempting to sign up with:', { email });
            const { data, error } = await auth.signUp(email, password);

            console.log('Signup response:', { data, error });

            if (error) {
                console.error('Signup error:', error);
                return { success: false, error: error.message };
            }

            if (data && data.user) {
                console.log('User created successfully:', data.user);
                setUser(data.user);
                return { success: true };
            }

            console.log('No user in response:', data);
            return { success: false, error: 'アカウント作成に失敗しました' };
        } catch (error) {
            console.error('Signup exception:', error);
            return { success: false, error: error.message };
        }
    };

    const loginWithLine = async () => {
        try {
            console.log('Attempting LINE login...');
            await auth.loginWithLine();

            // LINE認証はリダイレクトされるため、ここには到達しない
            // 成功はコールバックで処理される
            return { success: true };
        } catch (error) {
            console.error('LINE login exception:', error);
            return { success: false, error: error.message };
        }
    };

    const logout = async () => {
        try {
            await auth.signOut();
            setUser(null);
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    const value = {
        user,
        isLoading,
        login,
        signup,
        loginWithLine,
        logout,
        isAuthenticated: !!user
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
