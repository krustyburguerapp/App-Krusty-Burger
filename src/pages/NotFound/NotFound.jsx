import React from 'react';
import { useNavigate } from 'react-router-dom';
import './NotFound.css';

const NotFound = () => {
    const navigate = useNavigate();

    return (
        <div className="notfound-container">
            <div className="notfound-content">
                <div className="notfound-icon-wrapper">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="notfound-icon pulse-animation"
                    >
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M16 16s-1.5-2-4-2-4 2-4 2"></path>
                        <line x1="9" y1="9" x2="9.01" y2="9"></line>
                        <line x1="15" y1="9" x2="15.01" y2="9"></line>
                    </svg>
                    <div className="notfound-ghost">404</div>
                </div>

                <h1 className="notfound-title">¡Ay, caramba!</h1>
                <p className="notfound-message">
                    Parece que te has perdido. Esta página no existe o alguien se comió esta URL.
                </p>

                <button
                    className="notfound-button"
                    onClick={() => navigate('/menu')}
                    aria-label="Volver al inicio"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="notfound-button-icon"
                    >
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                        <polyline points="9 22 9 12 15 12 15 22"></polyline>
                    </svg>
                    Volver al Menú Seguros
                </button>
            </div>
        </div>
    );
};

export default NotFound;
