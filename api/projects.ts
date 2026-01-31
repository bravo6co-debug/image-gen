import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders } from './lib/gemini.js';
import { requireAuth } from './lib/auth.js';
import { saveProject, updateProject, getUserProjects, getProject, deleteProject } from './lib/mongodb.js';

/**
 * /api/projects
 * GET    - 프로젝트 목록 조회 (query: ?id=xxx 면 단건 조회)
 * POST   - 프로젝트 저장 (신규 또는 업데이트)
 * DELETE  - 프로젝트 삭제 (query: ?id=xxx)
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    setCorsHeaders(res, req.headers.origin as string);

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // 인증 확인
    const auth = requireAuth(req);
    if (!auth.authenticated || !auth.userId) {
        return res.status(401).json({ error: auth.error || '로그인이 필요합니다.' });
    }

    const userId = auth.userId;

    try {
        // =============================================
        // GET: 프로젝트 목록 또는 단건 조회
        // =============================================
        if (req.method === 'GET') {
            const projectId = req.query.id as string | undefined;

            if (projectId) {
                // 단건 조회 (scenarioData 포함)
                const project = await getProject(userId, projectId);
                if (!project) {
                    return res.status(404).json({ error: '프로젝트를 찾을 수 없습니다.' });
                }
                return res.status(200).json({
                    success: true,
                    project: {
                        _id: project._id!.toString(),
                        type: project.type,
                        title: project.title,
                        synopsis: project.synopsis,
                        productName: project.productName,
                        scenarioData: project.scenarioData,
                        createdAt: project.createdAt,
                        updatedAt: project.updatedAt,
                    },
                });
            }

            // 목록 조회 (scenarioData 제외)
            const projects = await getUserProjects(userId);
            return res.status(200).json({ success: true, projects });
        }

        // =============================================
        // POST: 프로젝트 저장 (신규 또는 업데이트)
        // =============================================
        if (req.method === 'POST') {
            const { projectId, type, title, synopsis, productName, scenarioData } = req.body;

            if (!scenarioData || !title) {
                return res.status(400).json({ error: 'title과 scenarioData는 필수입니다.' });
            }

            if (projectId) {
                // 기존 프로젝트 업데이트
                const updated = await updateProject(userId, projectId, {
                    title,
                    synopsis,
                    productName,
                    scenarioData,
                });
                if (!updated) {
                    return res.status(404).json({ error: '프로젝트를 찾을 수 없습니다.' });
                }
                return res.status(200).json({ success: true, projectId });
            }

            // 신규 프로젝트 생성
            const newProjectId = await saveProject(userId, {
                type: type || 'ad-scenario',
                title,
                synopsis,
                productName,
                scenarioData,
            });
            return res.status(201).json({ success: true, projectId: newProjectId });
        }

        // =============================================
        // DELETE: 프로젝트 삭제
        // =============================================
        if (req.method === 'DELETE') {
            const projectId = req.query.id as string;
            if (!projectId) {
                return res.status(400).json({ error: '삭제할 프로젝트 ID가 필요합니다.' });
            }

            const deleted = await deleteProject(userId, projectId);
            if (!deleted) {
                return res.status(404).json({ error: '프로젝트를 찾을 수 없습니다.' });
            }
            return res.status(200).json({ success: true });
        }

        return res.status(405).json({ error: 'Method not allowed' });

    } catch (e) {
        console.error('[projects] Error:', e);
        const msg = e instanceof Error ? e.message : 'Unknown error';
        return res.status(500).json({ error: msg });
    }
}
