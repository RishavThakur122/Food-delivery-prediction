import { Injectable } from '@angular/core';
import { jwtDecode } from 'jwt-decode';
import { LoginRequest, RegisterRequest, AuthResponse } from '../models/auth.model';

const API = 'http://localhost:5000/api/auth';
const KEY = 'sb_token';

@Injectable({ providedIn: 'root' })
export class AuthService {

    getToken(): string | null {
        return localStorage.getItem(KEY);
    }

    isLoggedIn(): boolean {
        const token = this.getToken();
        if (!token) return false;
        try {
            const decoded: any = jwtDecode(token);
            return decoded.exp * 1000 > Date.now(); // check not expired
        } catch { return false; }
    }

    getUserName(): string {
        try {
            const decoded: any = jwtDecode(this.getToken()!);
            return decoded.name ?? '';
        } catch { return ''; }
    }
    getUserId(): string {
        try {
            const decoded: any = jwtDecode(this.getToken()!);
            return decoded.userId ?? '';
        } catch { return ''; }
    }

    async register(dto: RegisterRequest): Promise<AuthResponse> {
        const res = await fetch(`${API}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dto)
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error ?? 'Registration failed');
        }
        const data: AuthResponse = await res.json();
        localStorage.setItem(KEY, data.token);
        return data;
    }

    async login(dto: LoginRequest): Promise<AuthResponse> {
        const res = await fetch(`${API}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dto)
        });
        if (!res.ok) throw new Error('Invalid email or password');
        const data: AuthResponse = await res.json();
        localStorage.setItem(KEY, data.token);
        return data;
    }

    logout(): void {
        localStorage.removeItem(KEY);
    }
}