import React, { useEffect, useState } from "react";
import API_BASE_URL from "../config";

const FinalModal = ({ show }) => {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [totalMarks, setTotalMarks] = useState(0);
  const [avgAccuracy, setAvgAccuracy] = useState(0);
  const [avgTime, setAvgTime] = useState(0);
  const username = localStorage.getItem("candidateId");

  useEffect(() => {
    if (!show || !username) return;

    const fetchResults = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/user-progress/${username}`);
        const data = await res.json();

        if (data.success && data.test) {
          const tests = Object.entries(data.test);
          setResults(tests);

          // ✅ Calculate Totals
          const totalMarks = tests.reduce((sum, [, v]) => sum + (v.marks || 0), 0);
          const avgAccuracy = tests.reduce((sum, [, v]) => sum + (v.accuracy || 0), 0) / tests.length;
          const avgTime = tests.reduce((sum, [, v]) => sum + (v.timeTaken || 0), 0) / tests.length;

          setTotalMarks(totalMarks);
          setAvgAccuracy(avgAccuracy.toFixed(1));
          setAvgTime(avgTime.toFixed(1));
        }
      } catch (err) {
        console.error("❌ Error fetching user results:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [show, username]);

  if (!show) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h2 style={styles.heading}>🎉 Congratulations! 🎉</h2>
        <p style={styles.subHeading}>You’ve successfully completed all tests!</p>

        {loading ? (
          <p style={styles.loading}>⏳ Loading your performance...</p>
        ) : results && results.length > 0 ? (
          <>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th>Test</th>
                  <th>Marks</th>
                  <th>Accuracy (%)</th>
                  <th>Time Taken (sec)</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {results.map(([testName, data]) => (
                  <tr key={testName}>
                    <td>{testName.toUpperCase()}</td>
                    <td>{data.marks}</td>
                    <td>{data.accuracy}</td>
                    <td>{data.timeTaken}</td>
                    <td style={data.passed ? styles.pass : styles.fail}>
                      {data.passed ? "✅ Passed" : "❌ Failed"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={styles.summaryBox}>
              <h3>📊 Summary</h3>
              <p><strong>Total Marks:</strong> {totalMarks}</p>
              <p><strong>Average Accuracy:</strong> {avgAccuracy}%</p>
              <p><strong>Average Time per Test:</strong> {avgTime}s</p>
            </div>
          </>
        ) : (
          <p>No test data found.</p>
        )}

        <p style={styles.footer}>🚀 You're officially a pro!</p>
      </div>
    </div>
  );
};

// ✅ Styles
const styles = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    backdropFilter: "blur(10px)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },
  modal: {
    backgroundColor: "#fff",
    padding: "30px",
    borderRadius: "12px",
    width: "800px",
    maxHeight: "90vh",
    overflowY: "auto",
    boxShadow: "0px 0px 25px rgba(255, 215, 0, 0.4)",
    textAlign: "center",
    color: "#222",
  },
  heading: {
    fontSize: "26px",
    fontWeight: "bold",
    color: "#28a745",
  },
  subHeading: {
    fontSize: "18px",
    color: "#555",
    marginBottom: "15px",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    marginBottom: "20px",
  },
  loading: {
    color: "#333",
    fontSize: "18px",
    margin: "20px 0",
  },
  summaryBox: {
    background: "#f8f9fa",
    borderRadius: "8px",
    padding: "15px",
    boxShadow: "inset 0px 0px 5px rgba(0,0,0,0.1)",
  },
  pass: { color: "#28a745", fontWeight: "bold" },
  fail: { color: "#dc3545", fontWeight: "bold" },
  footer: {
    marginTop: "20px",
    fontSize: "18px",
    fontWeight: "500",
    color: "#007bff",
  },
};

export default FinalModal;
