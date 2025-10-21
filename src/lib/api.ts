import axios from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "http://localhost:3001/api",
    withCredentials: false
});

export interface BackendUser {
    _id: string;
    name: string;
    color?: string;
}

export interface CreateUserResponse {
    user: BackendUser;
    isNew: boolean;
}

export interface BackendProjectSummary {
    _id: string;
    title: string;
    updatedAt: string;
}

export interface BackendProjectFull extends BackendProjectSummary {
    objects: any[];
    camera?: { position: [number, number, number]; target: [number, number, number] };
}

export async function createOrGetUser(name: string): Promise<CreateUserResponse> {
    const res = await api.post<CreateUserResponse>("/users", { name });
    return res.data;
}

export async function listProjectsByOwner(ownerId: string): Promise<BackendProjectSummary[]> {
    const res = await api.get<BackendProjectSummary[]>("/projects", { params: { ownerId } });
    return res.data;
}

export async function getProject(id: string): Promise<BackendProjectFull> {
    const res = await api.get<BackendProjectFull>(`/projects/${id}`);
    return res.data;
}

export async function createProjectApi(title: string, ownerId?: string): Promise<BackendProjectFull> {
    const res = await api.post<BackendProjectFull>("/projects", { title, ownerId });
    return res.data;
}

export async function updateProjectApi(id: string, payload: Partial<Pick<BackendProjectFull, 'objects' | 'camera'>>): Promise<BackendProjectFull> {
    const res = await api.put<BackendProjectFull>(`/projects/${id}`, payload);
    return res.data;
}

export async function deleteProjectApi(id: string): Promise<void> {
    await api.delete(`/projects/${id}`);
}

export async function enableProjectSharing(id: string, ownerId: string): Promise<{ message: string; shared: boolean }> {
    const res = await api.post(`/projects/${id}/share`, { ownerId });
    return res.data;
}

export async function disableProjectSharing(id: string, ownerId: string): Promise<{ message: string; shared: boolean }> {
    const res = await api.delete(`/projects/${id}/share`, { data: { ownerId } });
    return res.data;
}

export async function getSharedProject(id: string): Promise<BackendProjectFull> {
    const res = await api.get<BackendProjectFull>(`/projects/${id}/shared`);
    return res.data;
}

export default api;


