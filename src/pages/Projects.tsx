import React, { useEffect, useState } from "react";
import { createProject, listProjects, loadUser, deleteProject } from "../lib/storage";
import type { ProjectSummary } from "../lib/types";

interface Props {
    onOpenProject: (id: string) => void;
    onLogout: () => void;
}

const Projects: React.FC<Props> = ({ onOpenProject, onLogout }) => {
    const [title, setTitle] = useState("");
    const [projects, setProjects] = useState<ProjectSummary[]>([]);
    const [showMenu, setShowMenu] = useState<string | null>(null);
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

    const handleDelete = (projectId: string) => {
        if (window.confirm("Are you sure you want to delete this project? This action cannot be undone.")) {
            deleteProject(projectId);
            setProjects(listProjects().sort((a, b) => b.updatedAt - a.updatedAt));
            setShowMenu(null);
        }
    };

    const toggleMenu = (projectId: string) => {
        setShowMenu(showMenu === projectId ? null : projectId);
    };

    return (
        <div className="w-full min-h-dvh text-white bg-primary">
            <div className="w-full px-6 py-8">
                <header className="flex justify-between items-center gap-3 mb-8">
                    <h1 className="m-0 text-3xl font-bold">Projects</h1>
                    <button 
                        onClick={onLogout}
                        className="px-6 py-3 rounded-lg bg-secondary text-primary border-none hover:bg-secondary/80 transition-all font-medium"
                    >
                        Logout
                    </button>
                </header>
                
                <form onSubmit={create} className="flex gap-3 mb-10 max-w-2xl">
                    <input 
                        value={title} 
                        onChange={(e) => setTitle(e.target.value)} 
                        placeholder="Project title" 
                        className="px-4 py-3 rounded-lg border border-slate-700 bg-slate-800 text-white flex-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" 
                    />
                    <button 
                        type="submit" 
                        disabled={!title.trim()} 
                        className={`px-6 py-3 rounded-lg border-none ${
                            title.trim() 
                                ? "bg-primary text-white hover:bg-primary/80 transition-all" 
                                : "bg-secondary text-primary cursor-not-allowed"
                        }`}
                    >
                        Create
                    </button>
                </form>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                    {projects.map((p) => (
                        <div key={p.id} className="bg-slate-800 border border-slate-700 rounded-xl p-6 flex flex-col gap-4 hover:bg-slate-750 transition-colors relative group">
                            {/* Three dots menu */}
                            <div className="absolute top-4 right-4">
                                <button
                                    onClick={() => toggleMenu(p.id)}
                                    className="p-2 rounded-full hover:bg-slate-700 transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                    </svg>
                                </button>
                                
                                {/* Dropdown menu */}
                                {showMenu === p.id && (
                                    <div className="absolute right-0 top-10 bg-slate-700 border border-slate-600 rounded-lg shadow-lg z-10 min-w-[120px]">
                                        <button
                                            onClick={() => handleDelete(p.id)}
                                            className="w-full px-4 py-2 text-left text-red-400 hover:bg-slate-600 rounded-lg transition-colors"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                )}
                            </div>
                            
                            <div className="font-semibold text-xl truncate pr-8" title={p.title}>{p.title}</div>
                            <div className="text-sm opacity-75">Updated {new Date(p.updatedAt).toLocaleString()}</div>
                            <button 
                                onClick={() => onOpenProject(p.id)} 
                                className="mt-auto px-4 py-3 rounded-lg bg-primary text-white border-none hover:bg-primary/80 transition-all font-medium"
                            >
                                Open
                            </button>
                        </div>
                    ))}
                </div>
            </div>
            
            {/* Click outside to close menu */}
            {showMenu && (
                <div 
                    className="fixed inset-0 z-0" 
                    onClick={() => setShowMenu(null)}
                />
            )}
        </div>
    );
};

export default Projects;


