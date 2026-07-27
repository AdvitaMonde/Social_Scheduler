import { useEffect, useState } from "react";
import api from "../api/axios";
import AccountCard from "../components/AccountCard";
import ConnectMetaButton from "../components/ConnectMetaButton";

export default function Accounts() {
  const [accounts, setAccounts] = useState([]);
  
  
  // const [form, setForm] = useState({
  //   platform: "facebook",
  //   accountName: "",
  //   pageId: "",
  //   igUserId: "",
  //   accessToken: "",
  // });
  
  
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchAccounts = async () => {
    try {
      const res = await api.get("/accounts");
      setAccounts(res.data);
    } catch (err) {
      setError("Failed to load accounts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  // const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  // const handleSubmit = async (e) => {
  //   e.preventDefault();
  //   setError("");
  //   try {
  //     await api.post("/accounts", form);
  //     setForm({ platform: "facebook", accountName: "", pageId: "", igUserId: "", accessToken: "" });
  //     fetchAccounts();
  //   } catch (err) {
  //     setError(err.response?.data?.message || "Failed to connect account");
  //   }
  // };

  const handleDelete = async (id) => {
    if (!confirm("Disconnect this account?")) return;
    await api.delete(`/accounts/${id}`);
    fetchAccounts();
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Connected Accounts</h1>

      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-lg font-semibold mb-3">
        Connect Your Meta Account
        </h2>

        <p className="text-gray-600 mb-4">
          Connect your Facebook Page and Instagram Business account securely using Meta Login.
        </p>

        <ConnectMetaButton />
    </div>

      {/* <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="font-semibold mb-4">Connect a New Account</h2>
        <p className="text-sm text-gray-500 mb-4">
          Get your Page ID / Instagram Business Account ID and a long-lived Access Token from the{" "}
          <a
            href="https://developers.facebook.com/tools/explorer/"
            target="_blank"
            rel="noreferrer"
            className="text-indigo-600 underline"
          >
            Meta Graph API Explorer
          </a>
          .
        </p>

        {error && <p className="bg-red-100 text-red-700 text-sm p-2 rounded mb-4">{error}</p>}

        <form onSubmit={handleSubmit} className="grid gap-3">
          <select
            name="platform"
            value={form.platform}
            onChange={handleChange}
            className="border rounded px-3 py-2"
          >
            <option value="facebook">Facebook Page</option>
            <option value="instagram">Instagram Business Account</option>
          </select>

          <input
            name="accountName"
            placeholder="Friendly name (e.g. My Bakery Page)"
            value={form.accountName}
            onChange={handleChange}
            className="border rounded px-3 py-2"
            required
          />

          {form.platform === "facebook" ? (
            <input
              name="pageId"
              placeholder="Facebook Page ID"
              value={form.pageId}
              onChange={handleChange}
              className="border rounded px-3 py-2"
              required
            />
          ) : (
            <input
              name="igUserId"
              placeholder="Instagram Business Account ID"
              value={form.igUserId}
              onChange={handleChange}
              className="border rounded px-3 py-2"
              required
            />
          )}

          <input
            name="accessToken"
            placeholder="Long-lived Access Token"
            value={form.accessToken}
            onChange={handleChange}
            className="border rounded px-3 py-2"
            required
          />

          <button className="bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700">
            Connect Account
          </button>
        </form>
      </div> */}

      <h2 className="font-semibold mb-3">Your Accounts</h2>
      {loading ? (
        <p>Loading...</p>
      ) : accounts.length === 0 ? (
        <p className="text-gray-500">No accounts connected yet.</p>
      ) : (
        <div className="grid gap-3">
          {accounts.map((acc) => (
            <AccountCard key={acc._id} account={acc} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
