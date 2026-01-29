import jwt from 'jsonwebtoken';
import type { VercelRequest } from '@vercel/node';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

/**
 * JWT 토큰 생성 (24시간 유효)
 */
export function generateToken(): string {
    return jwt.sign(
        { role: 'admin', timestamp: Date.now() },
        JWT_SECRET,
        { expiresIn: '24h' }
    );
}

/**
 * JWT 토큰 검증
 */
export function verifyToken(token: string): boolean {
    try {
        jwt.verify(token, JWT_SECRET);
        return true;
    } catch {
        return false;
    }
}

/**
 * 비밀번호 검증
 */
export function verifyPassword(password: string): boolean {
    return password === ADMIN_PASSWORD;
}

/**
 * 요청에서 인증 토큰 추출 및 검증
 */
export function verifyAuth(req: VercelRequest): boolean {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return false;
    }

    const token = authHeader.replace('Bearer ', '');
    return verifyToken(token);
}

/**
 * 인증 미들웨어 - 인증 실패 시 에러 응답 반환
 */
export function requireAuth(req: VercelRequest): { authenticated: boolean; error?: string } {
    if (!verifyAuth(req)) {
        return {
            authenticated: false,
            error: '인증이 필요합니다. 로그인해 주세요.',
        };
    }

    return { authenticated: true };
}
