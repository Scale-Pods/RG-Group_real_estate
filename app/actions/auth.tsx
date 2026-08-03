'use server';

import { cookies } from 'next/headers';
import { SignJWT } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'your-fallback-secret-change-this';
const secret = new TextEncoder().encode(JWT_SECRET);

// Demo credentials — this build runs without a real backend (Supabase removed).
// Any user wanting real auth should reconnect a database and restore Supabase-backed login.
const DEMO_USERS = [
    { id: 'demo-admin', email: 'admin@rggroup.ae', password: 'RGGroup@2026', name: 'RG Group Admin' },
];

export async function login(prevState: any, formData: FormData) {
    const email = (formData.get('email') as string)?.toLowerCase().trim();
    const password = formData.get('password') as string;

    if (!email || !password) {
        return { error: 'Email and password are required' };
    }

    try {
        const user = DEMO_USERS.find(u => u.email === email);

        if (!user || user.password !== password) {
            return { error: 'Invalid email or password' };
        }

        const token = await new SignJWT({ userId: user.id, email: user.email, name: user.name })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('12h')
            .sign(secret);

        (await cookies()).set('auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 12,
            path: '/',
        });

        return { success: true };
    } catch (err) {
        console.error('Login error:', err);
        return { error: 'An unexpected error occurred' };
    }
}

export async function signup(prevState: any, formData: FormData) {
    return { error: 'Signup is currently disabled. Please contact an administrator.' };
}

export async function logout() {
    (await cookies()).delete('auth_token');
    return { success: true };
}

export async function forgotPassword(prevState: any, formData: FormData) {
    const email = (formData.get('email') as string)?.toLowerCase().trim();

    if (!email) {
        return { error: 'Email is required' };
    }

    // Password reset requires a connected database/email backend, which this demo build
    // does not have. Direct the user to the fixed demo credentials instead.
    return {
        error: 'Password reset is unavailable in this demo build. Use the demo login: admin@rggroup.ae / RGGroup@2026',
    };
}

export async function resetPassword(prevState: any, formData: FormData) {
    return {
        error: 'Password reset is unavailable in this demo build. Use the demo login: admin@rggroup.ae / RGGroup@2026',
    };
}
