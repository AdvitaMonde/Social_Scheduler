import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <nav className="bg-indigo-600 text-white px-6 py-4 flex justify-between items-center shadow">
      <Link to="/" className="text-xl font-bold">
        📅 AI Social Scheduler
      </Link>

      {currentUser && (
        <div className="flex items-center gap-4">
          <Link to="/" className="hover:underline">
            Dashboard
          </Link>
          <Link to="/accounts" className="hover:underline">
            Accounts
          </Link>
          <Link to="/create" className="hover:underline">
            New Post
          </Link>
          <span className="text-sm opacity-80">{currentUser.email}</span>
          <button
            onClick={handleLogout}
            className="bg-indigo-800 hover:bg-indigo-900 px-3 py-1 rounded text-sm"
          >
            Logout
          </button>
        </div>
      )}
    </nav>
  );
}
