import { MongoClient, Db } from 'mongodb';

const uri = process.env.MONGODB_URI;

if (!uri) {
    console.warn('MONGODB_URI is not defined. Using fallback settings.');
}

let client: MongoClient | null = null;
let cachedDb: Db | null = null;

/**
 * MongoDB 데이터베이스 연결
 * Vercel Serverless 환경에서 연결 풀링을 위해 캐싱 사용
 */
export async function getDatabase(): Promise<Db | null> {
    if (!uri) {
        return null;
    }

    if (cachedDb) {
        return cachedDb;
    }

    try {
        if (!client) {
            client = new MongoClient(uri);
            await client.connect();
        }

        cachedDb = client.db('s2v-db');
        return cachedDb;
    } catch (error) {
        console.error('MongoDB connection error:', error);
        return null;
    }
}

/**
 * 사용자 설정 스키마
 */
export interface UserSettings {
    _id: string;  // 'admin' 고정
    geminiApiKey?: string;
    textModel: string;
    imageModel: string;
    videoModel: string;
    ttsModel: string;
    ttsVoice: string;
    updatedAt: Date;
}

/**
 * 기본 설정값
 */
export const DEFAULT_SETTINGS: Omit<UserSettings, '_id' | 'updatedAt'> = {
    geminiApiKey: undefined,
    textModel: 'gemini-2.5-flash',
    imageModel: 'gemini-2.5-flash-image',
    videoModel: 'veo-3.1-fast-generate-preview',
    ttsModel: 'gemini-2.5-flash-preview-tts',
    ttsVoice: 'Kore',
};

/**
 * 설정 조회 (없으면 기본값 반환)
 */
export async function getSettings(): Promise<UserSettings> {
    const db = await getDatabase();

    if (!db) {
        return {
            _id: 'admin',
            ...DEFAULT_SETTINGS,
            updatedAt: new Date(),
        };
    }

    try {
        const settings = await db.collection<UserSettings>('settings').findOne({ _id: 'admin' });

        if (settings) {
            return settings;
        }

        // 설정이 없으면 기본값 반환
        return {
            _id: 'admin',
            ...DEFAULT_SETTINGS,
            updatedAt: new Date(),
        };
    } catch (error) {
        console.error('Failed to get settings:', error);
        return {
            _id: 'admin',
            ...DEFAULT_SETTINGS,
            updatedAt: new Date(),
        };
    }
}

/**
 * 설정 저장
 */
export async function saveSettings(settings: Partial<Omit<UserSettings, '_id' | 'updatedAt'>>): Promise<boolean> {
    const db = await getDatabase();

    if (!db) {
        console.error('Database not available');
        return false;
    }

    try {
        await db.collection<UserSettings>('settings').updateOne(
            { _id: 'admin' },
            {
                $set: {
                    ...settings,
                    updatedAt: new Date(),
                },
                $setOnInsert: {
                    _id: 'admin',
                },
            },
            { upsert: true }
        );

        return true;
    } catch (error) {
        console.error('Failed to save settings:', error);
        return false;
    }
}
