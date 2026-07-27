const statusColors = {
  pending: "bg-yellow-100 text-yellow-800",
  publishing: "bg-blue-100 text-blue-800",
  published: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  partial: "bg-orange-100 text-orange-800",
};

export default function PostCard({ post, onDelete }) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex justify-between items-start">
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[post.status]}`}>
          {post.status.toUpperCase()}
        </span>
        <button onClick={() => onDelete(post._id)} className="text-red-500 hover:text-red-700 text-sm">
          Delete
        </button>
      </div>

      <p className="mt-2 text-gray-800">{post.content}</p>

      {post.imageUrl && (
        <img
          src={post.imageUrl}
          alt="post"
          className="mt-2 rounded-md max-h-48 object-cover w-full"
        />
      )}

      <div className="mt-3 text-sm text-gray-500">
        📅 Scheduled: {new Date(post.scheduledTime).toLocaleString()}
      </div>

      <div className="mt-1 flex flex-wrap gap-1">
        {post.accounts?.map((acc) => (
          <span key={acc._id} className="text-xs bg-gray-100 px-2 py-1 rounded">
            {acc.platform === "facebook" ? "📘" : "📸"} {acc.accountName}
          </span>
        ))}
      </div>

      {post.results?.length > 0 && (
        <div className="mt-3 border-t pt-2 text-xs space-y-1">
          {post.results.map((r, i) => (
            <div key={i} className={r.success ? "text-green-600" : "text-red-600"}>
              {r.platform}: {r.success ? `Published (ID: ${r.postId})` : `Failed - ${r.error}`}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
