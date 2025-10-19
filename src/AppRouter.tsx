import React, { useMemo, useState } from "react";
import Login from "./pages/Login";
import Projects from "./pages/Projects";
import Editor from "./pages/Editor";
import { loadUser, saveUser } from "./lib/storage";

type Route = { name: "login" } | { name: "projects" } | { name: "editor", id: string };

const AppRouter: React.FC = () => {
    const initial = useMemo(() => {
        const hasUser = !!loadUser();
        return (hasUser ? { name: "projects" } : { name: "login" }) as Route;
    }, []);
    const [route, setRoute] = useState<Route>(initial);

    if (route.name === "login") {
        return <Login onLoggedIn={() => setRoute({ name: "projects" })} />;
    }
    if (route.name === "projects") {
        return <Projects onOpenProject={(id) => setRoute({ name: "editor", id })} onLogout={() => { saveUser({ name: "" }); setRoute({ name: "login" }); }} />;
    }
    return <Editor projectId={route.id} onBack={() => setRoute({ name: "projects" })} />;
};

export default AppRouter;


