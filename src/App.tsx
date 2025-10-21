import React from 'react';
import AppRouter from './AppRouter.tsx';
import { LoadingProvider, GlobalLoading } from './contexts/LoadingContext.tsx';

const App: React.FC = () => {
  return (
    <LoadingProvider>
      <AppRouter />
      <GlobalLoading />
    </LoadingProvider>
  );
};

export default App;
