import React, { useState, useEffect } from "react";
import { Collapse } from "antd";
import { db } from "../firebase/firebase";
import { collection, getDocs } from "firebase/firestore";
import styled from "styled-components";

const StyledPanelHeader = styled.span`
  font-size: 28px;
  font-weight: bold;
  color: ${({ temperature }) => {
    switch (temperature) {
      case "hot":
        return "rgb(200, 0, 0)";
      case "cold":
        return "rgb(0,0,175)";
      case "reference":
        return "rgb(200,175,0)";
      default:
        return "#222";
    }
  }};
`;

const StyledSubtitle = styled.h3`
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 16px;
  color: #333;
`;

const StyledListItem = styled.li`
  font-size: 20px;
  line-height: 1.6;
  margin-bottom: 12px; /* Adds spacing between list items */
`;

const { Panel } = Collapse;

const App = () => {
  const [items, setItems] = useState([]);
  const [activeKey, setActiveKey] = useState(["1"]);

  const onChange = (key) => {
    const latestKey = key?.[1]; // Get the most recent panel key

    // Ensure only the selected panel remains open
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
      }));

      // Filter out items where temperature is "reference"
      data = data.filter((item) => item.temperature !== "reference");

      // Define a priority order for sorting temperatures
      const temperatureOrder = { hot: 1, cold: 2 };

      // Sort items first by temperature and then by name
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

  return (
    <Collapse
      activeKey={activeKey}
      onChange={onChange}
      expandIcon={() => null} // This removes the caret icon
    >
      {items.map((item) => (
        <Panel
          header={
            <StyledPanelHeader temperature={item.temperature}>
              {item.name}
            </StyledPanelHeader>
          }
          key={item.key}
        >
          {" "}
          {item.instructions && item.instructions.length > 0 && (
            <>
              <StyledSubtitle>Instructions</StyledSubtitle>
              <ol>
                {item.instructions.map((instruction, index) => (
                  <StyledListItem key={index}>
                    {instruction.text}
                  </StyledListItem>
                ))}
              </ol>
            </>
          )}
        </Panel>
      ))}
    </Collapse>
  );
};

export default App;
