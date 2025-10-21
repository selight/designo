import { createOrGetUser, listProjectsByOwner } from "./api.ts";
import { saveUser, writeProjectsIndex } from "./storage.ts";

export async function loginOrRegisterAndLoad(name: string): Promise<{ userId: string; userName: string; isNew: boolean; }>{
    const { user, isNew } = await createOrGetUser(name);
    saveUser({ id: user._id, name: user.name });
    const projects = await listProjectsByOwner(user._id);
    writeProjectsIndex(projects.map(p => ({ id: p._id, title: p.title, updatedAt: new Date(p.updatedAt).getTime() })));
    return { userId: user._id, userName: user.name, isNew };
}


