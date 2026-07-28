import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

export default function CreatePost() {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccounts, setSelectedAccounts] = useState([]);
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/accounts").then((res) => setAccounts(res.data));
  }, []);

  const toggleAccount = (id) => {
    setSelectedAccounts((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (selectedAccounts.length === 0) {
      setError("Select at least one account to post to");
      return;
    }

    try {
      await api.post("/posts", {
        content,
        imageUrl: imageUrl || null,
        accounts: selectedAccounts,
        // datetime-local gives a plain string with no timezone info
        // (e.g. "2026-07-28T13:49"). Converting it with `new Date()` here,
        // in the browser, correctly interprets it as the user's local time
        // and produces an unambiguous UTC ISO string to send to the server
        // — avoiding the server (which runs in UTC) misreading it as UTC.
        scheduledTime: new Date(scheduledTime).toISOString(),
      });
      setSuccess("Post scheduled successfully!");
      setTimeout(() => navigate("/"), 1000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to schedule post");
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Schedule a New Post</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 grid gap-4">
        {error && <p className="bg-red-100 text-red-700 text-sm p-2 rounded">{error}</p>}
        {success && <p className="bg-green-100 text-green-700 text-sm p-2 rounded">{success}</p>}

        <div>
          <label className="block text-sm font-medium mb-1">Post Content</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full border rounded px-3 py-2"
            rows={4}
            placeholder="What do you want to share?"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Image URL (required for Instagram, optional for Facebook)
          </label>
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            className="w-full border rounded px-3 py-2"
            placeholder="https://example.com/image.jpg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Post to</label>
          {accounts.length === 0 ? (
            <p className="text-sm text-gray-500">
              No accounts connected yet. Go to the Accounts page first.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {accounts.map((acc) => (
                <button
                  type="button"
                  key={acc._id}
                  onClick={() => toggleAccount(acc._id)}
                  className={`px-3 py-1 rounded-full text-sm border ${
                    selectedAccounts.includes(acc._id)
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-gray-700"
                  }`}
                >
                  📘 {acc.pageName}
                  {acc.hasInstagram && ` · 📸 @${acc.instagramUsername}`}
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Schedule Date & Time</label>
          <input
            type="datetime-local"
            value={scheduledTime}
            onChange={(e) => setScheduledTime(e.target.value)}
            className="w-full border rounded px-3 py-2"
            required
          />
        </div>

        <button className="bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700">
          Schedule Post
        </button>
      </form>
    </div>
  );
}














// import { useEffect, useState } from "react";
// import { useNavigate } from "react-router-dom";
// import api from "../api/axios";

// export default function CreatePost() {
//   const [accounts, setAccounts] = useState([]);
//   const [selectedAccounts, setSelectedAccounts] = useState([]);
//   const [content, setContent] = useState("");
//   const [imageUrl, setImageUrl] = useState("");
//   const [scheduledTime, setScheduledTime] = useState("");
//   const [error, setError] = useState("");
//   const [success, setSuccess] = useState("");
//   const navigate = useNavigate();

//   useEffect(() => {
//     api.get("/accounts").then((res) => setAccounts(res.data));
//   }, []);

//   const toggleAccount = (id) => {
//     setSelectedAccounts((prev) =>
//       prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
//     );
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setError("");
//     setSuccess("");

//     if (selectedAccounts.length === 0) {
//       setError("Select at least one account to post to");
//       return;
//     }

//     try {
//       await api.post("/posts", {
//         content,
//         imageUrl: imageUrl || null,
//         accounts: selectedAccounts,
//         scheduledTime,
//       });
//       setSuccess("Post scheduled successfully!");
//       setTimeout(() => navigate("/"), 1000);
//     } catch (err) {
//       setError(err.response?.data?.message || "Failed to schedule post");
//     }
//   };

//   return (
//     <div className="max-w-2xl mx-auto p-6">
//       <h1 className="text-2xl font-bold mb-6">Schedule a New Post</h1>

//       <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 grid gap-4">
//         {error && <p className="bg-red-100 text-red-700 text-sm p-2 rounded">{error}</p>}
//         {success && <p className="bg-green-100 text-green-700 text-sm p-2 rounded">{success}</p>}

//         <div>
//           <label className="block text-sm font-medium mb-1">Post Content</label>
//           <textarea
//             value={content}
//             onChange={(e) => setContent(e.target.value)}
//             className="w-full border rounded px-3 py-2"
//             rows={4}
//             placeholder="What do you want to share?"
//             required
//           />
//         </div>

//         <div>
//           <label className="block text-sm font-medium mb-1">
//             Image URL (required for Instagram, optional for Facebook)
//           </label>
//           <input
//             type="url"
//             value={imageUrl}
//             onChange={(e) => setImageUrl(e.target.value)}
//             className="w-full border rounded px-3 py-2"
//             placeholder="https://example.com/image.jpg"
//           />
//         </div>

//         <div>
//           <label className="block text-sm font-medium mb-1">Post to</label>
//           {accounts.length === 0 ? (
//             <p className="text-sm text-gray-500">
//               No accounts connected yet. Go to the Accounts page first.
//             </p>
//           ) : (
//             <div className="flex flex-wrap gap-2">
//               {accounts.map((acc) => (
//                 <button
//                   type="button"
//                   key={acc._id}
//                   onClick={() => toggleAccount(acc._id)}
//                   className={`px-3 py-1 rounded-full text-sm border ${
//                     selectedAccounts.includes(acc._id)
//                       ? "bg-indigo-600 text-white border-indigo-600"
//                       : "bg-white text-gray-700"
//                   }`}
//                 >
//                   📘 {acc.pageName}
//                   {acc.hasInstagram && ` · 📸 @${acc.instagramUsername}`}
//                 </button>
//               ))}
//             </div>
//           )}
//         </div>

//         <div>
//           <label className="block text-sm font-medium mb-1">Schedule Date & Time</label>
//           <input
//             type="datetime-local"
//             value={scheduledTime}
//             onChange={(e) => setScheduledTime(e.target.value)}
//             className="w-full border rounded px-3 py-2"
//             required
//           />
//         </div>

//         <button className="bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700">
//           Schedule Post
//         </button>
//       </form>
//     </div>
//   );
// }
