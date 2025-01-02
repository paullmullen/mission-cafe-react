import React, { useState, useEffect } from "react";
import { Collapse, message } from "antd";
import { db } from "../firebase/firebase";
import {
  collection,
  getDocs,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import FeedbackForm from "../components/recipes/FeedbackForm";
import {
  StyledPanelHeader,
  StyledSubtitle,
  IngredientTable,
  TableCell,
  IngredientName,
  IngredientSize,
  IngredientAmount,
  StyledButton,
  ButtonContainer,
  StyledListItem,
  RecipeImage,
} from "./StyledComponents";

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
        image: doc.data().image,
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

    const recipeName =
      items.find((item) => item.key === key)?.name || "Unknown";

    try {
      // Get manager emails
      const managersSnapshot = await getDocs(collection(db, "managers"));
      const managersEmails = managersSnapshot.docs.map(
        (doc) => doc.data().email
      );

      // Add feedback to the issues collection
      await addDoc(collection(db, "issues"), {
        date: serverTimestamp(),
        description: feedback,
        recipe: recipeName,
        resolved: false,
        name, // Store the submitter's name
      });

      // Prepare HTML content for the email
      const htmlContent = `
      <p>A new feedback has been submitted:</p>
      <p><strong>Recipe:</strong> ${recipeName}</p>
      <p><strong>Feedback:</strong> ${feedback}</p>
      <p><strong>Submitted by:</strong> ${name}</p>
    `;

      // Add email notification to the mail collection
      await addDoc(collection(db, "mail"), {
        to: managersEmails, // Ensure this is an array of manager email addresses
        message: {
          subject: `New Feedback Submitted for Recipe: ${recipeName}`,
          html: htmlContent, // HTML content for the email
        },
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
          {/* Ingredients Section */}
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

          {/* Instructions + Image Section */}
          {item.instructions && item.instructions.length > 0 && (
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "flex-start",
              }}
            >
              {/* Instructions Section */}
              <div style={{ flex: 1, marginRight: "16px" }}>
                <StyledSubtitle>Instructions</StyledSubtitle>
                <ol>
                  {item.instructions.map((instruction, index) => (
                    <StyledListItem
                      key={index}
                      dangerouslySetInnerHTML={{ __html: instruction.text }}
                    />
                  ))}
                </ol>
              </div>

              {/* Recipe Image */}
              {item.image && (
                <RecipeImage
                  src={item.image}
                  alt={`${item.name} image`}
                  style={{
                    maxWidth: "300px",
                    maxHeight: "400px",
                    objectFit: "cover",
                    borderRadius: "8px",
                    boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
                  }}
                />
              )}
            </div>
          )}

          {/* Prep Section */}
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
