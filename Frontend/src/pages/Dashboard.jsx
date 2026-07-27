import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import PostCard from "../components/PostCard";

export default function Dashboard() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const fetchPosts = async () => {
    setLoading(true);
    const res = await api.get("/posts");
    setPosts(res.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleDelete = async (id) => {
    if (!confirm("Delete this post?")) return;
    await api.delete(`/posts/${id}`);
    fetchPosts();
  };

  const filteredPosts = filter === "all" ? posts : posts.filter((p) => p.status === filter);

  const counts = {
    pending: posts.filter((p) => p.status === "pending").length,
    published: posts.filter((p) => p.status === "published").length,
    failed: posts.filter((p) => p.status === "failed" || p.status === "partial").length,
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Link
          to="/create"
          className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
        >
          + New Post
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <p className="text-2xl font-bold text-yellow-600">{counts.pending}</p>
          <p className="text-sm text-gray-500">Pending</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{counts.published}</p>
          <p className="text-sm text-gray-500">Published</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <p className="text-2xl font-bold text-red-600">{counts.failed}</p>
          <p className="text-sm text-gray-500">Failed</p>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        {["all", "pending", "published", "failed", "partial"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-sm border capitalize ${
              filter === f ? "bg-indigo-600 text-white border-indigo-600" : "bg-white"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : filteredPosts.length === 0 ? (
        <p className="text-gray-500">No posts found. Schedule your first post!</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredPosts.map((post) => (
            <PostCard key={post._id} post={post} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
