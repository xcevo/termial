import React, { useState, useEffect } from "react";
import axios from "axios";
import Questions from "./components/Questions";
import Terminal from "./components/Terminal";
import Header from "./components/Header";
import API_BASE_URL from "./config";

const App = () => {
  const [verified, setVerified] = useState(null); // null = checking, true/false = done
  const [error, setError] = useState("");
  const [candidateId, setCandidateId] = useState("");

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get("token");
    const accessToken = localStorage.getItem("access_token");

    const cleanURL = () => {
      window.history.replaceState({}, document.title, window.location.pathname);
    };

    // ✅ Verify short-lived token from LMS
    const verifyWithUrlToken = async () => {
      try {
        const res = await axios.post(
          `${API_BASE_URL}/auth/verify-token`,
          { token: urlToken },
          { withCredentials: true }
        );

        localStorage.setItem("access_token", res.data.access_token);
        localStorage.setItem("candidateId", res.data.candidateId);
        setCandidateId(res.data.candidateId);

        console.log("✅ Verified LMS token for:", res.data.candidateId);
        setVerified(true);
        cleanURL();
      } catch (err) {
        console.error("❌ URL token verification failed:", err);
        setError(err.response?.data?.msg || "Token verification failed");
        setVerified(false);
      }
    };

    // ✅ Verify existing long-lived access token
    const verifyWithAccessToken = async () => {
      try {
        const res = await axios.post(`${API_BASE_URL}/auth/verify-token`, {
          token: accessToken,
        });
        localStorage.setItem("access_token", res.data.access_token);
        localStorage.setItem("candidateId", res.data.candidateId);
        setCandidateId(res.data.candidateId);
        setVerified(true);
      } catch (err) {
        console.error("❌ Access token invalid:", err);
        setError(err.response?.data?.msg || "Invalid access token");
        setVerified(false);
      }
    };

    const runVerification = async () => {
      if (urlToken) {
        await verifyWithUrlToken();
      } else if (accessToken) {
        await verifyWithAccessToken();
      } else {
        setError("No token provided. Please open from LMS.");
        setVerified(false);
      }
    };

    runVerification();
  }, []);

  // ✅ UI States
  if (verified === null)
    return (
      <div style={{ padding: 20, color: "white" }}>🔒 Verifying token...</div>
    );
  if (!verified)
    return <div style={{ padding: 20, color: "red" }}>❌ {error}</div>;

  // ✅ Once verified, show questions and terminal side by side
  return (
    <div>
      <Header />
      <div style={styles.container}>
        <div style={styles.questionsPanel}>
          <Questions username={candidateId} />
        </div>
        <div style={styles.terminalPanel}>
          <Terminal />
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: "flex",
    height: "calc(100vh - 60px)",
    marginTop: "60px",
  },
  questionsPanel: {
    flex: 1,
    background: "#181818",
    padding: "10px",
    borderRight: "2px solid #444",
  },
  terminalPanel: {
    flex: 2,
  },
};

export default App;
