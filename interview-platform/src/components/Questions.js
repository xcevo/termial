import React, { useEffect, useState } from "react";
import ResultModal from "./ResultModal";
import FinalModal from "./FinalModal";
import API_BASE_URL from "../config";

const TOTAL_TEST_TIME = 300; // 5 minutes in seconds ⏱️

const Questions = ({ username }) => {
  if (!username) username = localStorage.getItem("candidateId");

  const [question, setQuestion] = useState(null);
  const [testTimeLeft, setTestTimeLeft] = useState(TOTAL_TEST_TIME);
  const [testStartTime, setTestStartTime] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLastQuestion, setIsLastQuestion] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isSuccess, setIsSuccess] = useState(null);
  const [testNumber, setTestNumber] = useState(1);
  const [testCount, setTestCount] = useState(null);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [loading, setLoading] = useState(true);
  const [score, setScore] = useState(0);
  const [timeTaken, setTimeTaken] = useState(0);

  // ✅ Fetch total number of tests
  const fetchTestCount = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/test-count`);
      const data = await res.json();
      if (data.success) setTestCount(data.testCount);
    } catch (error) {
      console.error("Error fetching test count:", error);
    }
  };

  // ✅ Fetch total number of questions for a test
  const fetchTotalQuestions = async (testNum) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/test-info`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testNumber: `test${testNum}` }),
      });
      const data = await res.json();
      if (data.success) setTotalQuestions(data.totalQuestions);
      else setTotalQuestions(0);
    } catch (error) {
      console.error("Error fetching total questions:", error);
    }
  };

  // ✅ Fetch specific question
  const fetchQuestion = async (index) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/question`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testNumber: `test${testNumber}`,
          questionIndex: index,
          username,
        }),
      });

      const data = await res.json();
      setQuestion(data.question);
      setIsLastQuestion(data.isLast);

      if (!testStartTime) setTestStartTime(Date.now()); // start timer once
    } catch (err) {
      console.error("Error fetching question:", err);
      setQuestion("Failed to load question.");
    }
    setLoading(false);
  };

  // ✅ Load all test-related data
  useEffect(() => {
    fetchTestCount();
  }, []);

  useEffect(() => {
    if (testCount !== null) {
      fetchTotalQuestions(testNumber);
      fetchQuestion(0);
    }
  }, [testNumber, testCount]);

  // ✅ Global Timer (5 minutes)
  useEffect(() => {
    if (!testStartTime) return;
    const timer = setInterval(() => {
      setTestTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleTestTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [testStartTime]);

  // ✅ Auto submit when time ends
  const handleTestTimeout = () => {
    alert("⏰ Time’s up! Submitting your test automatically...");
    handleSubmitTest();
  };

  // ✅ Next question
  const handleNextQuestion = () => {
    if (!isLastQuestion) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      fetchQuestion(nextIndex);
    }
  };

  // ✅ Manual or auto submit
  const handleSubmitTest = async () => {
    const elapsedSeconds = Math.floor((Date.now() - testStartTime) / 1000);
    setTimeTaken(elapsedSeconds);

    try {
      const res = await fetch(`${API_BASE_URL}/api/validate-test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testNumber,
          username,
          timeTaken: elapsedSeconds,
        }),
      });

      const data = await res.json();

      setIsSuccess(data.success);
      setScore(data.marks);

      // ✅ If this was the last test → show FinalModal
      if (data.success && testNumber === testCount) {
        setTimeout(() => {
          setShowModal(true);
          setTestNumber(testCount + 1); // triggers FinalModal
        }, 300);
        return;
      }

      setShowModal(true);
    } catch (error) {
      console.error("Error submitting test:", error);
      setIsSuccess(false);
      setShowModal(true);
    }
  };

  // ✅ Retry test
  const handleRetry = () => {
    setShowModal(false);
    setCurrentIndex(0);
    setIsLastQuestion(false);
    setTestTimeLeft(TOTAL_TEST_TIME);
    setScore(null);
    setTestStartTime(Date.now());
    fetchQuestion(0);
  };

  // ✅ Proceed to next test
  const handleProceed = () => {
    setShowModal(false);
    if (testNumber >= testCount) {
      setShowModal(true);
      return;
    }
    setTestNumber((prev) => prev + 1);
    setCurrentIndex(0);
    setIsLastQuestion(false);
    setTestTimeLeft(TOTAL_TEST_TIME);
    setScore(null);
    setTestStartTime(Date.now());
    fetchTotalQuestions(testNumber + 1);
    fetchQuestion(0);
  };

  // ✅ Loading check
  if (testCount === null)
    return <p style={styles.loading}>⏳ Loading test count...</p>;

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>
        🧪 Test {testNumber} — Question {currentIndex + 1} of {totalQuestions}
      </h2>

      <p style={styles.timer}>
        🕒 Time Left:{" "}
        {Math.floor(testTimeLeft / 60)}:
        {(testTimeLeft % 60).toString().padStart(2, "0")}
      </p>

      {loading ? (
        <p style={styles.loading}>⏳ Loading...</p>
      ) : (
        <p style={styles.questionText}>{question}</p>
      )}

      {!loading && question !== "Finish" && (
        <>
          {!isLastQuestion ? (
            <button style={styles.button} onClick={handleNextQuestion}>
              Next ➡️
            </button>
          ) : (
            <button style={styles.submitButton} onClick={handleSubmitTest}>
              ✅ Submit Test
            </button>
          )}
        </>
      )}

      {/* ✅ Modal Handling */}
      {testNumber > testCount ? (
        <FinalModal show={true} /> 
      ) : (
      <ResultModal
        show={showModal}
        isSuccess={isSuccess}
        onRetry={handleRetry}
        onProceed={handleProceed}
        score={score}
        timeTaken={timeTaken}
      />
)}

    </div>
  );
};

const styles = {
  container: {
    padding: "20px",
    color: "white",
    fontSize: "18px",
    textAlign: "center",
    position: "relative",
  },
  title: {
    fontWeight: "bold",
    fontSize: "20px",
    marginBottom: "10px",
  },
  loading: {
    fontSize: "20px",
    color: "#FFD700",
  },
  questionText: {
    marginTop: "15px",
    fontSize: "20px",
  },
  timer: {
    backgroundColor: "#111",
    color: "#FFD700",
    padding: "8px 15px",
    borderRadius: "5px",
    display: "inline-block",
    marginBottom: "10px",
  },
  button: {
    marginTop: "20px",
    padding: "10px 25px",
    fontSize: "16px",
    backgroundColor: "#007bff",
    color: "white",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
  },
  submitButton: {
    marginTop: "20px",
    padding: "10px 25px",
    fontSize: "16px",
    backgroundColor: "#28a745",
    color: "white",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
  },
};

export default Questions;
