import React, { useEffect, useState } from "react";
import { db } from "../firebase/firebase";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  addDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import styled from "styled-components";
import { Line } from "react-chartjs-2";
import "chart.js/auto"; // Required for Chart.js

// Styled components
const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
`;

const TableHeader = styled.th`
  padding: 10px;
  text-align: left;
  background-color: #f4f4f4;
`;

const TableRow = styled.tr``;

const TableData = styled.td`
  padding: 10px;
  border: 1px solid #ddd;
`;

const Input = styled.input`
  width: 100%;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  ${({ isError }) => isError && `border-color: red; background-color: #f8d7da;`}
`;

const Textarea = styled.textarea`
  width: 100%;
  height: 100px;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  resize: vertical;
`;

const Button = styled.button`
  padding: 10px 20px;
  background-color: #4caf50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 20px;

  &:hover {
    background-color: #45a049;
  }
`;

const FormContainer = styled.div`
  font-size: 1.2rem; /* Set default font size for the form */
`;

// Safety state
const Safety = () => {
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);
  const [safetyItems, setSafetyItems] = useState([]);
  const [historicalData, setHistoricalData] = useState({});

  useEffect(() => {
    const fetchSafetyItems = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "safety-specs"));
        const items = querySnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            name: doc.id,
            label: data.name,
            unit: data.units || "",
            lowerSpec: data.lowerSpec || null,
            upperSpec: data.upperSpec || null,
            category: data.category || null,
          };
        });
        const sortedItems = items.sort((a, b) =>
          a.category < b.category ? -1 : 1
        );
        setSafetyItems(sortedItems);
      } catch (error) {
        console.error("Error fetching safety items:", error);
      }
    };

    fetchSafetyItems();
  }, []); // Runs once when the component mounts

  useEffect(() => {
    const fetchData = async () => {
      try {
        const today = new Date();
        const startOfDay = new Date(today.setHours(0, 0, 0, 0));
        const endOfDay = new Date(today.setHours(23, 59, 59, 999));

        const q = query(
          collection(db, "safety-record"),
          where("date", ">=", Timestamp.fromDate(startOfDay)),
          where("date", "<=", Timestamp.fromDate(endOfDay)),
          orderBy("date")
        );

        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map((doc) => doc.data());

        if (data.length > 0) {
          const record = data[0];
          const preloadedData = {};
          record.measurements.forEach((item) => {
            preloadedData[item.name] = item.value;
          });
          preloadedData["Safety Briefing Topic Discussed"] =
            record.safetyTopic || "";
          preloadedData["Recorded By"] = record.recordedBy || "";
          setFormData(preloadedData);
        } else {
          const initialData = {};
          safetyItems.forEach((item) => {
            initialData[item.name] = "";
          });
          initialData["Safety Briefing Topic Discussed"] = "";
          initialData["Recorded By"] = "";
          initialData["Notes"] = ""; // Initialize Notes field
          setFormData(initialData);
        }
      } catch (error) {
        console.error("Error fetching safety records:", error);
      } finally {
        setLoading(false);
      }
    };

    if (safetyItems.length > 0) {
      fetchData();
    }
  }, [safetyItems]); // Runs whenever safetyItems is updated

  useEffect(() => {
    const fetchHistoricalData = async () => {
      const now = new Date();
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(now.getDate() - 90);

      const data = {};

      try {
        for (const item of safetyItems) {
          const q = query(
            collection(db, "safety-record"),
            where("date", ">=", Timestamp.fromDate(ninetyDaysAgo)),
            orderBy("date")
          );

          const querySnapshot = await getDocs(q);
          const itemData = querySnapshot.docs.map((doc) => {
            const record = doc.data();
            const measurement = record.measurements.find(
              (m) => m.name === item.name
            );
            return {
              date: record.date.toDate(),
              value: measurement?.value || 0,
            };
          });

          data[item.name] = itemData;
        }

        setHistoricalData(data);
      } catch (error) {
        console.error("Error fetching historical data:", error);
      } finally {
        setLoading(false); // Loading is done after fetching historical data
      }
    };

    if (safetyItems.length > 0) {
      fetchHistoricalData();
    }
  }, [safetyItems]); // Runs whenever safetyItems is updated

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const newMeasurements = safetyItems.map((item) => ({
        name: item.name,
        value: formData[item.name] || "",
      }));

      const newRecord = {
        date: Timestamp.now(),
        recordedBy: formData["Recorded By"] || "Unknown", // Fallback if empty
        measurements: newMeasurements,
        safetyTopic: formData["Safety Briefing"] || "",
        notes: formData["Notes"] || "", // Save notes if present
      };

      // Get today's date to check for existing record
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0));
      const endOfDay = new Date(today.setHours(23, 59, 59, 999));

      // Check if there's an existing record for today
      const q = query(
        collection(db, "safety-record"),
        where("date", ">=", Timestamp.fromDate(startOfDay)),
        where("date", "<=", Timestamp.fromDate(endOfDay)),
        orderBy("date")
      );

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        // If no records exist for today, create a new document
        await addDoc(collection(db, "safety-record"), newRecord);
        console.log("New safety record added successfully");
      } else {
        // If records exist, update the existing document
        const docId = querySnapshot.docs[0].id;
        await updateDoc(doc(db, "safety-record", docId), newRecord);
        console.log(`Updated safety record with ID: ${docId}`);
      }
    } catch (error) {
      console.error("Error saving record:", error);
    }
  };

  const getInputStyle = (name, value) => {
    const item = safetyItems.find((item) => item.name === name);
    if (!item) return {};

    const { lowerSpec, upperSpec } = item;

    if (lowerSpec !== null && value < lowerSpec) {
      return { isError: true };
    }
    if (upperSpec !== null && value > upperSpec) {
      return { isError: true };
    }
    return {};
  };

  const getRangeText = (item) => {
    const { lowerSpec, upperSpec } = item;

    if (
      lowerSpec !== null &&
      lowerSpec !== undefined &&
      upperSpec !== null &&
      upperSpec !== undefined
    ) {
      return `${lowerSpec} to ${upperSpec}`;
    } else if (lowerSpec !== null && lowerSpec !== undefined) {
      return `> ${lowerSpec}`;
    } else if (upperSpec !== null && upperSpec !== undefined) {
      return `< ${upperSpec}`;
    }

    return "";
  };

  if (loading) {
    return <div>Loading...</div>;
  }
  const renderGraph = (itemName) => {
    const data = historicalData[itemName];
    if (!data) return null;

    const chartData = {
      labels: data.map((d) => d.date.toLocaleDateString()),
      datasets: [
        {
          data: data.map((d) => d.value),
          borderColor: "rgba(75,192,192,1)",
          backgroundColor: "rgba(75,192,192,0.2)",
        },
      ],
    };

    const chartOptions = {
      plugins: {
        legend: {
          display: false, // Hides the legend
        },
      },
      scales: {
        x: {
          title: {
            display: false,
          },
        },
        y: {
          title: {
            display: false,
          },
        },
      },
    };

    return <Line data={chartData} options={chartOptions} height={75} />;
  };

  return (
    <div>
      <FormContainer>
        <form onSubmit={handleSave}>
          <Table>
            <thead>
              <TableRow>
                <TableHeader>Food Safety Element</TableHeader>
                <TableHeader>Measurement</TableHeader>
              </TableRow>
            </thead>
            <tbody>
              {safetyItems.map((item) => (
                <React.Fragment key={item.name}>
                  {/* Row for the input field */}
                  <TableRow>
                    <TableData>
                      {item.label} ({getRangeText(item)}
                      {item.unit})
                    </TableData>
                    <TableData>
                      <div>
                        <Input
                          type="number"
                          name={item.name}
                          value={formData[item.name] || ""}
                          onChange={handleChange}
                          placeholder={`Enter ${item.label}`}
                          {...getInputStyle(item.name, formData[item.name])}
                        />
                      </div>
                    </TableData>
                  </TableRow>

                  {/* Row for the graph */}
                  <TableRow>
                    <TableData colSpan={2} style={{ padding: "10px" }}>
                      <h3>{item.label} Historical Data</h3>
                      {renderGraph(item.name)}{" "}
                      {/* This renders the graph for the safety item */}
                    </TableData>
                  </TableRow>
                </React.Fragment>
              ))}
              {/* Safety Topic Row */}
              <TableRow>
                <TableData>Safety Briefing Topic Discussed</TableData>
                <TableData>
                  <Textarea
                    name="Safety Briefing"
                    value={formData["Safety Briefing"] || ""}
                    onChange={handleChange}
                    placeholder="Safety Briefing Topic Discussed"
                  />
                </TableData>
              </TableRow>
              {/* Recorded By Row */}
              <TableRow>
                <TableData>Recorded By</TableData>
                <TableData>
                  <Input
                    type="text"
                    name="Recorded By"
                    value={formData["Recorded By"] || ""}
                    onChange={handleChange}
                    placeholder="Enter your name or initials"
                  />
                </TableData>
              </TableRow>
              {/* Notes Row */}
              <TableRow>
                <TableData>Notes</TableData>
                <TableData>
                  <Textarea
                    name="Notes"
                    value={formData["Notes"] || ""}
                    onChange={handleChange}
                    placeholder="Enter any notes"
                  />
                </TableData>
              </TableRow>
            </tbody>
          </Table>
          <Button type="submit">Save Record</Button>
        </form>
      </FormContainer>
    </div>
  );
};

export default Safety;
