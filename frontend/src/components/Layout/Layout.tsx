import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';

const Layout: React.FC = () => {
  return (
    <div className="app-layout">
      <a href="#main-content" className="skip-link">
        Zum Hauptinhalt springen
      </a>
      <Header />
      <main id="main-content" className="main-content" tabIndex={-1}>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default Layout;