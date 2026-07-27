export default function AccountCard({ account, onDelete }) {
  return (
    <div className="bg-white rounded-lg shadow p-4 flex justify-between items-center">
      <div>
        <p className="font-semibold">
          📘 {account.pageName}
          {account.hasInstagram && ` · 📸 @${account.instagramUsername}`}
        </p>
        <p className="text-sm text-gray-500 capitalize">{account.status}</p>
        <p className="text-xs text-gray-400">Page ID: {account.pageId}</p>
      </div>
      <button
        onClick={() => onDelete(account._id)}
        className="text-red-500 hover:text-red-700 text-sm font-medium"
      >
        Disconnect
      </button>
    </div>
  );
}
