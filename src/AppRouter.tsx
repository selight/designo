import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Login from "./pages/Login";
import Projects from "./pages/Projects";
import Editor from "./pages/Editor";
import { clearAppStorage } from "./lib/storage";

const AppRouter: React.FC = () => {

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
                    element={<Editor />} 
                />
                <Route 
                    path="/" 
                    element={<Navigate to="/projects" replace />} 
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

export default AppRouter;


