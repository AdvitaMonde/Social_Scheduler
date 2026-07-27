import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

// "Connect Facebook & Instagram" UI. Uses the shared `api` axios instance
// (see src/api/axios.js) so every request automatically carries the
// current user's Firebase ID token — required since these routes are
// behind requireAuth on the backend.

export default function ConnectMetaButton() {
  const navigate = useNavigate();
  const [connections, setConnections] = useState([]);
  const [pendingPages, setPendingPages] = useState(null); // set after OAuth redirect back
  const [pendingState, setPendingState] = useState(null);
  const [status, setStatus] = useState(null); // { type: 'success' | 'error', message }
  const [loading, setLoading] = useState(true);

  // On mount: load existing connections, and check if we just landed back
  // from the Meta OAuth redirect (callback appended ?meta_pending=... or
  // ?meta_status=error&meta_message=...).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pending = params.get('meta_pending');
    const metaStatus = params.get('meta_status');
    const metaMessage = params.get('meta_message');

    if (metaStatus === 'error') {
      setStatus({ type: 'error', message: metaMessage || 'Connection failed.' });
    }

    if (pending) {
      setPendingState(pending);
      fetchPendingPages(pending);
    } else {
      loadConnections();
    }

    // Clean the query string so a refresh doesn't re-trigger this.
    window.history.replaceState({}, '', window.location.pathname);
  }, []);

  async function loadConnections() {
    setLoading(true);
    try {
      const res = await api.get('/meta/status');
      setConnections(res.data.connections || []);
    } finally {
      setLoading(false);
    }
  }

  async function fetchPendingPages(state) {
    setLoading(true);
    try {
      const res = await api.get(`/meta/pending/${state}`);
      // If there's only one Page, auto-select it — no picker needed.
      if (res.data.pages.length === 1) {
        await selectPage(state, res.data.pages[0].pageId);
      } else {
        setPendingPages(res.data.pages);
        setLoading(false);
      }
    } catch (err) {
      setStatus({ type: 'error', message: 'That connection attempt expired. Try again.' });
      setLoading(false);
    }
  }

  async function selectPage(state, pageId) {
    setLoading(true);
    try {
      const res = await api.post('/meta/select-page', { state, pageId });
      setStatus({
        type: 'success',
        message: `Connected ${res.data.pageName}${
          res.data.instagramConnected ? ` + Instagram (@${res.data.instagramUsername})` : ''
        }.`
      });
      setPendingPages(null);
      setTimeout(() => {
      navigate("/create");
      }, 1000);
      // await loadConnections();
    } catch (err) {
      setStatus({
        type: 'error',
        message: err.response?.data?.error || 'Could not finalize connection.'
      });
    } finally {
      setLoading(false);
    }
  }

  // async function handleConnectClick() {
  //   // /meta/connect needs an authenticated request to attach the Firebase
  //   // token, so we fetch the Meta auth URL first, then do the top-level
  //   // redirect ourselves (a plain window.location.href to the backend
  //   // route can't carry an Authorization header).
  //   try {
  //     const res = await api.get('/meta/connect');
  //     window.location.href = res.data.url;
  //   } catch (err) {
  //     setStatus({ type: 'error', message: 'Could not start the connection. Try again.' });
  //   }
  // }

 async function handleConnectClick() {

  console.log("API BASE:", api.defaults.baseURL);

  try {
    const res = await api.get('/meta/connect');
    console.log(res.data);

    window.location.href = res.data.url;

  } catch(err) {
    console.log(err);
  }
}

  async function handleDisconnect(pageId) {
    await api.delete(`/meta/connections/${pageId}`);
    await loadConnections();
  }

  if (loading) return <p>Loading...</p>;

  // Step: user has multiple Pages, ask them to pick one.
  // if (pendingPages) {
  //   return (
  //     <div>
  //       <h3>Select a Page to connect</h3>
  //       <ul>
  //         {pendingPages.map((p) => (
  //           <li key={p.pageId}>
  //             {p.pageName}
  //             {p.hasInstagram ? ` (Instagram: @${p.instagramUsername})` : ' (no Instagram linked)'}
  //             <button onClick={() => selectPage(pendingState, p.pageId)}>Select</button>
  //           </li>
  //         ))}
  //       </ul>
  //     </div>
  //   );
  // }

  if (pendingPages) {
  return (
    <div className="min-h-screen bg-gray-100 p-8">

      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-lg p-8">

        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Select a Page to connect
        </h2>

        <p className="text-gray-500 mb-6">
          Choose the Facebook Page you want to connect with your scheduler.
        </p>


        <div className="space-y-4">

          {pendingPages.map((p) => (

            <div
              key={p.pageId}
              className="
                flex
                items-center
                justify-between
                border
                rounded-xl
                p-5
                bg-gray-50
                hover:bg-gray-100
                transition
              "
            >

              <div>

                <h3 className="text-lg font-semibold text-gray-800">
                  {p.pageName}
                </h3>


                {p.hasInstagram ? (

                  <p className="text-sm text-green-600 mt-1">
                    ✓ Instagram @{p.instagramUsername}
                  </p>

                ) : (

                  <p className="text-sm text-gray-500 mt-1">
                    No Instagram linked
                  </p>

                )}

              </div>


              <button
                onClick={() => selectPage(pendingState, p.pageId)}
                className="
                  bg-blue-600
                  hover:bg-blue-700
                  text-white
                  px-5
                  py-2
                  rounded-lg
                  font-medium
                  transition
                "
              >
                Select
              </button>


            </div>

          ))}

        </div>

      </div>

    </div>
  );
}


  // return (
  //   <div>
  //     {status && (
  //       <p style={{ color: status.type === 'error' ? 'crimson' : 'seagreen' }}>
  //         {status.message}
  //       </p>
  //     )}

  //     {connections.length === 0 ? (
  //       <button onClick={handleConnectClick}>Connect Facebook &amp; Instagram</button>
  //     ) : (
  //       <div>
  //         {connections.map((c) => (
  //           <div key={c.pageId}>
  //             <strong>{c.pageName}</strong> — {c.status}
  //             {c.instagramConnected && ` · Instagram @${c.instagramUsername}`}
  //             {c.status === 'expired' && (
  //               <button onClick={handleConnectClick}>Reconnect</button>
  //             )}
  //             <button onClick={() => handleDisconnect(c.pageId)}>Disconnect</button>
  //           </div>
  //         ))}
  //         <button onClick={handleConnectClick}>Connect another Page</button>
  //       </div>
  //     )}
  //   </div>
  // );

  return (
  <div className="min-h-screen bg-gray-100 p-8">

    <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-lg p-8">

      <h1 className="text-3xl font-bold text-gray-800 mb-2">
        Social Connections
      </h1>

      <p className="text-gray-500 mb-6">
        Connect your Facebook Page and Instagram Business account
        to publish scheduled posts automatically.
      </p>


      {status && (
        <div
          className={`p-4 rounded-lg mb-5 ${
            status.type === "error"
              ? "bg-red-100 text-red-700"
              : "bg-green-100 text-green-700"
          }`}
        >
          {status.message}
        </div>
      )}


      {connections.length === 0 ? (

        <button
          onClick={handleConnectClick}
          className="
            w-full
            bg-blue-600
            hover:bg-blue-700
            text-white
            font-semibold
            py-3
            rounded-xl
            transition
          "
        >
          Connect Facebook & Instagram
        </button>

      ) : (

        <div className="space-y-4">

          <h2 className="text-xl font-semibold text-gray-700">
            Connected Accounts
          </h2>


          {connections.map((c) => (

            <div
              key={c.pageId}
              className="
                border
                rounded-xl
                p-5
                flex
                justify-between
                items-center
                bg-gray-50
              "
            >

              <div>
                <h3 className="font-bold text-lg text-gray-800">
                  {c.pageName}
                </h3>

                <p className="text-sm text-green-600">
                  ● {c.status}
                </p>


                {c.instagramConnected && (
                  <p className="text-gray-600 mt-1">
                    Instagram: @{c.instagramUsername}
                  </p>
                )}

              </div>


              <button
                onClick={() => handleDisconnect(c.pageId)}
                className="
                  bg-red-500
                  hover:bg-red-600
                  text-white
                  px-4
                  py-2
                  rounded-lg
                "
              >
                Disconnect
              </button>

            </div>

          ))}


          <button
            onClick={handleConnectClick}
            className="
              w-full
              border-2
              border-blue-600
              text-blue-600
              hover:bg-blue-50
              py-3
              rounded-xl
              font-semibold
            "
          >
            Connect Another Page
          </button>


        </div>

      )}

    </div>

  </div>
);

}
