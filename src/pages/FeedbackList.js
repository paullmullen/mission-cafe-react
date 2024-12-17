import React, { useState, useEffect } from "react";
import { db } from "../firebase/firebase";
import { collection, getDocs } from "firebase/firestore";

const FeedbackList = () => {
  const [issues, setIssues] = useState([]);

  useEffect(() => {
    const fetchIssues = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "issues"));
        console.log("Fetched issues snapshot:", querySnapshot);

        const issuesData = querySnapshot.docs
          .map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              date: data.date?.toDate().toLocaleDateString(),
              description: data.description,
              recipe: data.recipe,
              name: data.name ?? "Anonymous",
              resolved: data.resolved ?? false,
            };
          })
          .filter((issue) => !issue.resolved); // Filter only unresolved issues

        setIssues(issuesData);
      } catch (error) {
        console.error("Failed to load issues:", error);
      }
    };

    fetchIssues();
  }, []);

  return (
    <div>
      <h2>User Feedback</h2>
      {issues.length > 0 ? (
        issues.map((issue) => (
          <div
            key={issue.id}
            style={{
              marginBottom: "16px",
              paddingBottom: "16px",
              borderBottom: "1px solid #ccc",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <colgroup>
                <col style={{ width: "20%" }} />
                <col style={{ width: "80%" }} />
              </colgroup>
              <tbody>
                <tr>
                  <td
                    style={{
                      fontWeight: "bold",
                      padding: "8px",
                      background: "#f9f9f9",
                    }}
                  >
                    Date:
                  </td>
                  <td style={{ padding: "8px" }}>{issue.date}</td>
                </tr>
                <tr>
                  <td
                    style={{
                      fontWeight: "bold",
                      padding: "8px",
                      background: "#f9f9f9",
                    }}
                  >
                    Reported by:
                  </td>
                  <td style={{ padding: "8px" }}>{issue.name}</td>
                </tr>
                <tr>
                  <td
                    style={{
                      fontWeight: "bold",
                      padding: "8px",
                      background: "#f9f9f9",
                    }}
                  >
                    Recipe:
                  </td>
                  <td style={{ padding: "8px" }}>{issue.recipe}</td>
                </tr>
                <tr>
                  <td
                    style={{
                      fontWeight: "bold",
                      padding: "8px",
                      background: "#f9f9f9",
                    }}
                  >
                    Resolved:
                  </td>
                  <td style={{ padding: "8px" }}>
                    {issue.resolved ? "Yes" : "No"}
                  </td>
                </tr>
                <tr>
                  <td
                    style={{
                      fontWeight: "bold",
                      padding: "8px",
                      background: "#f9f9f9",
                    }}
                  >
                    Description:
                  </td>
                  <td style={{ padding: "8px" }}>{issue.description}</td>
                </tr>
              </tbody>
            </table>
          </div>
        ))
      ) : (
        <p>No unresolved feedback available.</p>
      )}
    </div>
  );
};

export default FeedbackList;
