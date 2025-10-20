import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Login from "./pages/Login";
import Projects from "./pages/Projects";
import Editor from "./pages/Editor";
import { loadUser, saveUser } from "./lib/storage";

const AppRouter: React.FC = () => {
    const hasUser = !!loadUser();

    return (
        <Router>
            <Routes>
                <Route 
                    path="/login" 
                    element={
                        hasUser ? 
                        <Navigate to="/projects" replace /> : 
                        <LoginWrapper />
                    } 
                />
                <Route 
                    path="/projects" 
                    element={
                        hasUser ? 
                        <ProjectsWrapper /> : 
                        <Navigate to="/login" replace />
                    } 
                />
                <Route 
                    path="/editor/:projectId" 
                    element={
                        hasUser ? 
                        <Editor /> : 
                        <Navigate to="/login" replace />
                    } 
                />
                <Route 
                    path="/" 
                    element={<Navigate to={hasUser ? "/projects" : "/login"} replace />} 
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
                saveUser({ name: "" }); 
                navigate("/login"); 
            }} 
        />
    );
};

export default AppRouter;


