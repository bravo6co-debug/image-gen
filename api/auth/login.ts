import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders } from '../lib/gemini';
import { verifyPassword, generateToken } from '../lib/auth';

/**
 * POST /api/auth/login
 * 비밀번호로 로그인하고 JWT 토큰 반환
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    setCorsHeaders(res, req.headers.origin as string);

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { password } = req.body;

        if (!password || typeof password !== 'string') {
            return res.status(400).json({
                success: false,
                error: '비밀번호를 입력해 주세요.',
            });
        }

        if (!verifyPassword(password)) {
            return res.status(401).json({
                success: false,
                error: '비밀번호가 올바르지 않습니다.',
            });
        }

        const token = generateToken();

        return res.status(200).json({
            success: true,
            token,
            expiresIn: '24h',
        });
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({
            success: false,
            error: '로그인 처리 중 오류가 발생했습니다.',
        });
    }
}
