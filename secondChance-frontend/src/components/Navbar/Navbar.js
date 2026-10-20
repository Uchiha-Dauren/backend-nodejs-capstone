import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
export default function Navbar() {
  const { isLoggedIn, setIsLoggedIn, userName, setUserName } = useAppContext();
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();
  const logout = () => {
    ['auth-token', 'name', 'email'].forEach(key => sessionStorage.removeItem(key));
    setIsLoggedIn(false); setUserName(''); navigate('/app');
  };
  return <nav className="navbar navbar-expand-md bg-white border-bottom" aria-label="Main navigation">
    <div className="container-fluid px-4">
      <a className="navbar-brand fw-bold" href="/home.html">SecondChance<span className="brand-dot">.</span></a>
      <button className="navbar-toggler" onClick={() => setExpanded(!expanded)} aria-expanded={expanded} aria-controls="main-navigation" aria-label="Toggle navigation"><span className="navbar-toggler-icon" /></button>
      <div id="main-navigation" className={`collapse navbar-collapse ${expanded ? 'show' : ''}`}>
        <ul className="navbar-nav ms-auto align-items-md-center gap-2" onClick={() => setExpanded(false)}>
          <li className="nav-item"><a className="nav-link" href="/home.html">Home</a></li>
          <li className="nav-item"><NavLink className="nav-link" to="/app" end>Items</NavLink></li>
          <li className="nav-item"><NavLink className="nav-link" to="/app/search">Search</NavLink></li>
          {isLoggedIn ? <>
            <li className="nav-item"><Link className="nav-link" to="/app/profile">Welcome, {userName}</Link></li>
            <li className="nav-item"><button className="btn btn-outline-secondary" onClick={logout}>Logout</button></li>
          </> : <>
            <li className="nav-item"><Link className="nav-link" to="/app/login">Login</Link></li>
            <li className="nav-item"><Link className="btn btn-primary" to="/app/register">Register</Link></li>
          </>}
        </ul>
      </div>
    </div>
  </nav>;
}
