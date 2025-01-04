import React, { useState, useEffect } from "react";
import { Collapse, message } from "antd";
import { db } from "../firebase/firebase"; // Update with your Firebase import path
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  where,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  StyledPanelHeader,
  StyledSubtitle,
  StyledListItem,
  ButtonContainer,
  StyledButton,
} from "../pages/StyledComponents";
import FeedbackForm from "../components/recipes/FeedbackForm"; // Assuming FeedbackForm is already implemented

const { Panel } = Collapse;

const Reference = () => {
  const [items, setItems] = useState([]);
  const [feedbackVisible, setFeedbackVisible] = useState({});
  const [feedbackText, setFeedbackText] = useState({});
  const [submitterName, setSubmitterName] = useState({});
  const [activeKey, setActiveKey] = useState([]);

  useEffect(() => {
    const fetchReferences = async () => {
      const q = query(
        collection(db, "mission-cafe"),
        orderBy("status"),
        where("temperature", "==", "reference")
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          key: doc.id,
          ...doc.data(),
        }));
        setItems(data);
      });
      return unsubscribe; // Cleanup subscription on unmount
    };

    fetchReferences();
  }, []);

  const toggleFeedback = (key) => {
    setFeedbackVisible((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleFeedbackChange = (key, text) => {
    setFeedbackText((prev) => ({
      ...prev,
      [key]: text,
    }));
  };

  const handleNameChange = (key, name) => {
    setSubmitterName((prev) => ({
      ...prev,
      [key]: name,
    }));
  };

  const handleFeedbackSubmit = async (key) => {
    const feedback = feedbackText[key];
    const name = submitterName[key];

    if (!feedback || !name) {
      message.error("Please complete all fields before submitting.");
      return;
    }

    try {
      await addDoc(collection(db, "issues"), {
        date: serverTimestamp(),
        description: feedback,
        reference: items.find((item) => item.key === key)?.name || "Unknown",
        resolved: false,
        name, // Store the submitter's name
      });

      message.success("Thank you for your feedback! It has been submitted.");
      setFeedbackText((prev) => ({ ...prev, [key]: "" }));
      setSubmitterName((prev) => ({ ...prev, [key]: "" }));
      setFeedbackVisible((prev) => ({ ...prev, [key]: false }));
    } catch (error) {
      console.error("Error submitting feedback:", error);
      message.error(
        "An error occurred while submitting your feedback. Please try again."
      );
    }
  };

  const getPanelHeaderStyle = (status) => {
    switch (status) {
      case "new":
        return { color: "black" }; // Green background
      case "zmanager":
        return { color: "orange" }; // Red background
      default:
        return { color: "gray" }; // Yellow for no status
    }
  };

  // Function to substitute ^^number^^ with the correct date
  const handleSubstituteDate = (htmlString) => {
    return htmlString.replace(/\^\^(\d+)\^\^/g, (match, days) => {
      const numDays = parseInt(days, 10);
      const currentDate = new Date();
      currentDate.setDate(currentDate.getDate() + numDays);

      // Format date as DD-MMM-YYYY (e.g., 26-Dec-2024)
      const day = String(currentDate.getDate()).padStart(2, "0");
      const monthNames = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      const month = monthNames[currentDate.getMonth()];
      const year = currentDate.getFullYear();

      const formattedDate = `${day}-${month}-${year}`;
      return formattedDate;
    });
  };

  const onChange = (key) => {
    const latestKey = key?.[1];
    setActiveKey([latestKey]);
  };
  return (
    <Collapse activeKey={activeKey} onChange={onChange} expandIcon={() => null}>
      {items.map((item) => (
        <Panel
          header={
            <StyledPanelHeader
              style={getPanelHeaderStyle(item.status || "")}
              temperature="reference"
            >
              {item.name}
            </StyledPanelHeader>
          }
          key={item.key}
        >
          {/* Instructions Section */}
          {item.instructions && item.instructions.length > 0 && (
            <>
              <span>
                {item.instructions.map((instruction, index) => (
                  <StyledListItem
                    key={index}
                    dangerouslySetInnerHTML={{
                      __html: handleSubstituteDate(instruction.text),
                    }}
                  />
                ))}
              </span>
            </>
          )}

          {/* Feedback Form */}
          {feedbackVisible[item.key] && (
            <FeedbackForm
              feedbackText={feedbackText[item.key] || ""}
              setFeedbackText={(text) => handleFeedbackChange(item.key, text)}
              submitterName={submitterName[item.key] || ""}
              setSubmitterName={(name) => handleNameChange(item.key, name)}
              onSubmit={() => handleFeedbackSubmit(item.key)}
            />
          )}

          {/* Buttons */}
          <ButtonContainer>
            <StyledButton onClick={() => toggleFeedback(item.key)}>
              Feedback
            </StyledButton>
          </ButtonContainer>
        </Panel>
      ))}
    </Collapse>
  );
};

export default Reference;
