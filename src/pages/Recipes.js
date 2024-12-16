import React, { useState, useEffect } from "react";
import { Collapse, message } from "antd";
import { db } from "../firebase/firebase";
import {
  collection,
  getDocs,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import styled from "styled-components";

const StyledPanelHeader = styled.span`
  font-size: 28px;
  font-weight: bold;
  color: ${({ temperature }) => {
    switch (temperature) {
      case "hot":
        return "rgb(200, 0, 0)";
      case "cold":
        return "rgb(0, 0, 175)";
      case "reference":
        return "rgb(200, 175, 0)";
      default:
        return "#222";
    }
  }};
`;

const StyledSubtitle = styled.h3`
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 16px;
  color: #000;
`;

const StyledListItem = styled.li`
  font-size: 20px;
  line-height: 1.6;
  margin-bottom: 12px;
`;

const IngredientTable = styled.table`
  width: 100%;
  table-layout: fixed;
  margin-left: 16px;
  border-collapse: collapse;
`;

const TableCell = styled.td`
  padding: 8px;
  text-align: left;
  word-break: break-word;
  font-size: 16px;
  border: none;
`;

const IngredientName = styled.span`
  font-weight: bold;
  font-size: 22px;
`;

const IngredientSize = styled.span`
  font-size: 16px;
`;

const IngredientAmount = styled.span`
  font-size: 20px;
`;

const StyledButton = styled.button`
  text-transform: uppercase;
  background-color: #f0f0f0;
  color: #333;
  border: 1px solid #ccc;
  padding: 8px 16px;
  font-size: 16px;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.2s ease;

  &:hover {
    background-color: #d9d9d9;
  }
`;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: flex-start;
  gap: 16px;
  margin-top: 24px;
`;

const FeedbackContainer = styled.div`
  margin-top: 16px;
  display: flex;
  flex-direction: column;
`;

const FeedbackTextarea = styled.textarea`
  width: 100%;
  height: 80px;
  padding: 8px;
  font-size: 16px;
  margin-bottom: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  resize: none;
`;

const { Panel } = Collapse;

const App = () => {
  const [items, setItems] = useState([]);
  const [activeKey, setActiveKey] = useState(["1"]);
  const [feedbackVisible, setFeedbackVisible] = useState({});
  const [feedbackText, setFeedbackText] = useState({});
  const [submitterName, setSubmitterName] = useState({}); // State for names

  const onChange = (key) => {
    const latestKey = key?.[1];
    setActiveKey([latestKey]);
  };

  const fetchData = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "mission-cafe"));
      let data = querySnapshot.docs.map((doc) => ({
        key: doc.id,
        name: doc.data().name,
        temperature: doc.data().temperature,
        instructions: doc.data().instructions,
        ingredients: doc.data().ingredients,
        prep: doc.data().prep,
        prepVisible: false,
      }));

      data = data.filter((item) => item.temperature !== "reference");

      const temperatureOrder = { hot: 1, cold: 2 };
      data.sort((a, b) => {
        const tempA = temperatureOrder[a.temperature] ?? 3;
        const tempB = temperatureOrder[b.temperature] ?? 3;

        if (tempA !== tempB) {
          return tempA - tempB;
        }
        return a.name.localeCompare(b.name);
      });

      setItems(data);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const togglePrep = (key) => {
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.key === key ? { ...item, prepVisible: !item.prepVisible } : item
      )
    );
  };

  const toggleFeedback = (key) => {
    setFeedbackVisible((prev) => ({ ...prev, [key]: !prev[key] }));
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
        recipe: items.find((item) => item.key === key)?.name || "Unknown",
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

  const handleFeedbackChange = (key, text) => {
    setFeedbackText((prev) => ({ ...prev, [key]: text }));
  };

  const handleNameChange = (key, name) => {
    setSubmitterName((prev) => ({ ...prev, [key]: name }));
  };

  return (
    <Collapse activeKey={activeKey} onChange={onChange} expandIcon={() => null}>
      {items.map((item) => (
        <Panel
          header={
            <StyledPanelHeader temperature={item.temperature}>
              {item.name}
            </StyledPanelHeader>
          }
          key={item.key}
        >
          {item.ingredients && item.ingredients.length > 0 && (
            <>
              {item.ingredients.map((ingredient, index) => {
                const sizesArray = ingredient.ingredientSizes.split(", ");
                const amountsArray = ingredient.ingredientAmounts.split(", ");

                return (
                  <div key={index}>
                    <IngredientName>{ingredient.ingredientName}</IngredientName>
                    <IngredientTable>
                      <tbody>
                        <tr>
                          {sizesArray.map((size, idx) => (
                            <TableCell key={`size-${idx}`}>
                              <IngredientSize>{size}</IngredientSize>
                            </TableCell>
                          ))}
                        </tr>
                        <tr>
                          {amountsArray.map((amount, idx) => (
                            <TableCell key={`amount-${idx}`}>
                              <IngredientAmount>{amount}</IngredientAmount>
                            </TableCell>
                          ))}
                        </tr>
                      </tbody>
                    </IngredientTable>
                    <hr />
                  </div>
                );
              })}
            </>
          )}

          {item.instructions && item.instructions.length > 0 && (
            <>
              <StyledSubtitle>Instructions</StyledSubtitle>
              <ol>
                {item.instructions.map((instruction, index) => (
                  <StyledListItem
                    key={index}
                    dangerouslySetInnerHTML={{ __html: instruction.text }}
                  />
                ))}
              </ol>
            </>
          )}

          {item.prepVisible && item.prep && (
            <div
              style={{
                marginTop: "16px",
                padding: "16px",
                border: "1px solid #ccc",
                borderRadius: "4px",
                backgroundColor: "#f9f9f9",
              }}
              dangerouslySetInnerHTML={{ __html: item.prep }}
            />
          )}

          {feedbackVisible[item.key] && (
            <FeedbackContainer>
              <FeedbackTextarea
                value={feedbackText[item.key] || ""}
                onChange={(e) => handleFeedbackChange(item.key, e.target.value)}
                placeholder="Enter your feedback here..."
              />
              <input
                type="text"
                value={submitterName[item.key] || ""}
                onChange={(e) => handleNameChange(item.key, e.target.value)}
                placeholder="Enter your name..."
                style={{
                  marginBottom: "8px",
                  padding: "8px",
                  fontSize: "16px",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  width: "100%",
                }}
              />
              <StyledButton onClick={() => handleFeedbackSubmit(item.key)}>
                Submit
              </StyledButton>
            </FeedbackContainer>
          )}

          <ButtonContainer>
            {item.prep && (
              <StyledButton onClick={() => togglePrep(item.key)}>
                {item.prepVisible ? "Hide Prep" : "Prep"}
              </StyledButton>
            )}
            <StyledButton onClick={() => toggleFeedback(item.key)}>
              Feedback
            </StyledButton>
          </ButtonContainer>
        </Panel>
      ))}
    </Collapse>
  );
};

export default App;
