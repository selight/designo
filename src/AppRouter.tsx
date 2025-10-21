import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Login from "./pages/Login.tsx";
import Projects from "./pages/Projects.tsx";
import Editor from "./pages/Editor.tsx";
import { clearAppStorage, loadUser } from "./lib/storage.ts";

const AppRouter: React.FC = () => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

    useEffect(() => {
        // Check if user is authenticated on app load
        const user = loadUser();
        setIsAuthenticated(!!user);

        // Listen for authentication changes
        const handleUserChange = () => {
            const user = loadUser();
            setIsAuthenticated(!!user);
        };

        window.addEventListener('app:user-changed', handleUserChange);
        return () => window.removeEventListener('app:user-changed', handleUserChange);
    }, []);

    // Show loading state while checking authentication
    if (isAuthenticated === null) {
        return (
            <div className="w-screen h-screen flex items-center justify-center bg-slate-900">
                <div className="text-white">Loading...</div>
            </div>
        );
    }

    return (
        <Router>
            <Routes>
                <Route 
                    path="/login" 
                    element={<LoginWrapper />} 
                />
                <Route 
                    path="/projects" 
                    element={<ProjectsWrapper />} 
                />
                <Route 
                    path="/editor/:projectId" 
                    element={<EditorWrapper />} 
                />
                <Route 
                    path="/share/:projectId" 
                    element={<ShareWrapper />} 
                />
                <Route 
                    path="/" 
                    element={
                        isAuthenticated ? 
                            <Navigate to="/projects" replace /> : 
                            <Navigate to="/login" replace />
                    } 
                />
            </Routes>
        </Router>
    );
};

const LoginWrapper: React.FC = () => {
    const navigate = useNavigate();
    return <Login onLoggedIn={() => navigate("/projects")} />;
};

const ProjectsWrapper: React.FC = () => {
    const navigate = useNavigate();
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

    useEffect(() => {
        const user = loadUser();
        setIsAuthenticated(!!user);
        
        if (!user) {
            navigate("/login");
        }
    }, [navigate]);

    if (isAuthenticated === null) {
        return (
            <div className="w-screen h-screen flex items-center justify-center bg-slate-900">
                <div className="text-white">Loading...</div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return null; // Will redirect to login
    }

    return (
        <Projects 
            onOpenProject={(id) => navigate(`/editor/${id}`)} 
            onLogout={() => { 
                clearAppStorage();
                navigate("/login"); 
            }} 
        />
    );
};

const EditorWrapper: React.FC = () => {
    const navigate = useNavigate();
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

    useEffect(() => {
        const user = loadUser();
        setIsAuthenticated(!!user);
        
        if (!user) {
            navigate("/login");
        }
    }, [navigate]);

    if (isAuthenticated === null) {
        return (
            <div className="w-screen h-screen flex items-center justify-center bg-slate-900">
                <div className="text-white">Loading...</div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return null; // Will redirect to login
    }

    return <Editor />;
};

const ShareWrapper: React.FC = () => {
    const navigate = useNavigate();
    return (
        <Login 
            onLoggedIn={() => {
                // After login, redirect to the shared project
                const pathParts = window.location.pathname.split('/');
                const projectId = pathParts[pathParts.length - 1];
                navigate(`/editor/${projectId}`);
            }} 
        />
    );
};

export default AppRouter;


