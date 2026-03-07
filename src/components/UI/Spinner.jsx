import './Spinner.css';

export default function Spinner({ size = 'md', color = 'primary' }) {
    return (
        <div className={`spinner spinner-${size} spinner-${color}`}>
            <div className="spinner-ring"></div>
        </div>
    );
}
