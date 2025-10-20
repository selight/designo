import type { ProjectData, ProjectSummary, UserProfile } from "./types";

const USER_KEY = "app.user";
const PROJECTS_INDEX_KEY = "app.projects.index";
const PROJECT_KEY_PREFIX = "app.project.";

export function saveUser(user: UserProfile) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function loadUser(): UserProfile | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

export function listProjects(): ProjectSummary[] {
    const raw = localStorage.getItem(PROJECTS_INDEX_KEY);
    if (!raw) return [];
    try {
        return JSON.parse(raw);
    } catch {
        return [];
    }
}

function writeProjectsIndex(list: ProjectSummary[]) {
    localStorage.setItem(PROJECTS_INDEX_KEY, JSON.stringify(list));
}

export function createProject(title: string): ProjectData {
    const id = crypto.randomUUID();
    const now = Date.now();
    const project: ProjectData = { id, title, objects: [], updatedAt: now };
    localStorage.setItem(PROJECT_KEY_PREFIX + id, JSON.stringify(project));
    const index = listProjects();
    index.push({ id, title, updatedAt: now });
    writeProjectsIndex(index);
    return project;
}

export function saveProject(project: ProjectData) {
    project.updatedAt = Date.now();
    
    try {
        const projectJson = JSON.stringify(project);
        const sizeKB = Math.round(projectJson.length / 1024);
        console.log(`Saving project ${project.id}, size: ${sizeKB}KB`);
        
        localStorage.setItem(PROJECT_KEY_PREFIX + project.id, projectJson);
        
        const index = listProjects();
        const entry = index.find((p) => p.id === project.id);
        if (entry) {
            entry.title = project.title;
            entry.updatedAt = project.updatedAt;
        } else {
            index.push({ id: project.id, title: project.title, updatedAt: project.updatedAt });
        }
        writeProjectsIndex(index);
    } catch (error) {
        if (error instanceof Error && error.name === 'QuotaExceededError') {
            console.error('Storage quota exceeded for project:', project.id);
            throw new Error('Project too large for browser storage. Try removing some objects or using smaller STL files.');
        }
        throw error;
    }
}

export function loadProject(id: string): ProjectData | null {
    const raw = localStorage.getItem(PROJECT_KEY_PREFIX + id);
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

export function deleteProject(id: string): void {
    // Remove the project data from localStorage
    localStorage.removeItem(PROJECT_KEY_PREFIX + id);
    
    // Remove the project from the projects index
    const index = listProjects();
    const updatedIndex = index.filter(project => project.id !== id);
    writeProjectsIndex(updatedIndex);
}


