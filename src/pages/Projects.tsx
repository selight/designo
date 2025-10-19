import React, { useEffect, useState } from "react";
import { createProject, listProjects, loadUser } from "../lib/storage";
import type { ProjectSummary } from "../lib/types";

interface Props {
    onOpenProject: (id: string) => void;
    onLogout: () => void;
}

const Projects: React.FC<Props> = ({ onOpenProject, onLogout }) => {
    const [title, setTitle] = useState("");
    const [projects, setProjects] = useState<ProjectSummary[]>([]);
    const user = loadUser();

    useEffect(() => {
        setProjects(listProjects().sort((a, b) => b.updatedAt - a.updatedAt));
    }, []);

    const create = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;
        const project = createProject(title.trim());
        setTitle("");
        setProjects(listProjects().sort((a, b) => b.updatedAt - a.updatedAt));
        onOpenProject(project.id);
    };

    return (
        <div className="p-5 text-slate-200 bg-slate-900 min-h-dvh">
            <header className="flex justify-between items-center gap-3">
                <h1 className="m-0">Projects{user ? ` – ${user.name}` : ""}</h1>
                <button 
                    onClick={onLogout} 
                    className="px-3 py-2 rounded-lg border border-secondary bg-secondary text-primary hover:border-primary transition-all"
                >
                    Logout
                </button>
            </header>
            <form onSubmit={create} className="flex gap-2 mt-4 flex-wrap">
                <input 
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)} 
                    placeholder="Project title" 
                    className="px-3 py-2.5 rounded-lg border border-slate-700 bg-slate-800 text-white min-w-[220px] flex-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" 
                />
                <button 
                    type="submit" 
                    disabled={!title.trim()} 
                    className={`px-3.5 py-2.5 rounded-lg border-none ${
                        title.trim() 
                            ? "bg-primary text-white hover:border-secondary transition-all" 
                            : "bg-secondary text-primary cursor-not-allowed"
                    }`}
                >
                    Create
                </button>
            </form>
            <ul className="list-none p-0 mt-6 grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
                {projects.map((p) => (
                    <li key={p.id} className="bg-slate-800 border border-slate-700 rounded-xl p-3.5 flex gap-2 flex-col">
                        <div className="font-semibold">{p.title}</div>
                        <div className="text-xs opacity-75">Updated {new Date(p.updatedAt).toLocaleString()}</div>
                        <button 
                            onClick={() => onOpenProject(p.id)} 
                            className="mt-1.5 px-2.5 py-2 rounded-lg bg-primary text-white border-none hover:border-secondary transition-all"
                        >
                            Open
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default Projects;


